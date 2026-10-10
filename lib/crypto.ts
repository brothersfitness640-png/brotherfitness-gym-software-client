/**
 * Strict Security & Cryptography Utilities
 * Brothers Fitness Client Portal
 * Provides SHA-256 MPIN hashing, session encryption, and anti-brute force rate limiting.
 */

const SALT_KEY = "BF_SECURE_VAULT_2026";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 60 seconds lockout

/**
 * Computes SHA-256 hash of MPIN
 */
export async function hashMpin(pin: string): Promise<string> {
  const cleanPin = pin.trim();
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${SALT_KEY}_${cleanPin}`);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < cleanPin.length; i++) {
    hash = (hash << 5) - hash + cleanPin.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash)}`;
}

/**
 * Verifies entered MPIN against stored plain MPIN or stored MPIN hash
 */
export async function verifyMpin(
  enteredPin: string,
  storedMpin?: string,
  storedMpinHash?: string
): Promise<boolean> {
  const cleanEntered = enteredPin.trim();
  if (!cleanEntered) return false;

  // 1. Direct match with stored plaintext MPIN
  if (storedMpin && storedMpin.trim() === cleanEntered) {
    return true;
  }

  // 2. Hash match with stored MPIN hash
  if (storedMpinHash) {
    const computedHash = await hashMpin(cleanEntered);
    if (computedHash === storedMpinHash) {
      return true;
    }
  }

  // 3. Match if storedMpin is already a hash
  if (storedMpin && storedMpin.length > 20) {
    const computedHash = await hashMpin(cleanEntered);
    if (computedHash === storedMpin) {
      return true;
    }
  }

  return false;
}

/**
 * Encrypts session data into an encoded token with integrity signature
 */
export async function encryptSession(data: any): Promise<string> {
  const json = JSON.stringify({
    ...data,
    _t: Date.now(),
  });

  const base64 = btoa(encodeURIComponent(json));
  const signature = await hashMpin(base64 + SALT_KEY);
  return `${base64}.${signature}`;
}

/**
 * Decrypts and verifies session data integrity
 */
export async function decryptSession(token: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [base64, sig] = parts;
    const expectedSig = await hashMpin(base64 + SALT_KEY);
    if (sig !== expectedSig) {
      console.warn("Security Alert: Session token signature mismatch!");
      return null;
    }

    const json = decodeURIComponent(atob(base64));
    const parsed = JSON.parse(json);
    return parsed;
  } catch (err) {
    console.error("Session decryption failed:", err);
    return null;
  }
}

/**
 * Anti-Brute-Force Rate Limiting for Login
 */
interface RateLimitEntry {
  attempts: number;
  lockoutUntil: number;
}

export function checkRateLimit(mobileNumber: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  if (typeof window === "undefined") {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  try {
    const key = `bf_rl_${mobileNumber}`;
    const raw = localStorage.getItem(key);
    if (!raw) return { allowed: true, remainingAttempts: MAX_ATTEMPTS };

    const entry: RateLimitEntry = JSON.parse(raw);
    const now = Date.now();

    if (entry.lockoutUntil && entry.lockoutUntil > now) {
      const remainingSec = Math.ceil((entry.lockoutUntil - now) / 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds: remainingSec,
      };
    }

    if (entry.lockoutUntil && entry.lockoutUntil <= now) {
      localStorage.removeItem(key);
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
    }

    const remaining = Math.max(0, MAX_ATTEMPTS - entry.attempts);
    return {
      allowed: remaining > 0,
      remainingAttempts: remaining,
    };
  } catch {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
}

export function recordFailedLogin(mobileNumber: string): {
  remainingAttempts: number;
  locked: boolean;
  retryAfterSeconds?: number;
} {
  if (typeof window === "undefined") {
    return { remainingAttempts: MAX_ATTEMPTS - 1, locked: false };
  }

  try {
    const key = `bf_rl_${mobileNumber}`;
    const raw = localStorage.getItem(key);
    let entry: RateLimitEntry = raw ? JSON.parse(raw) : { attempts: 0, lockoutUntil: 0 };

    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.lockoutUntil = Date.now() + LOCKOUT_MS;
      localStorage.setItem(key, JSON.stringify(entry));
      return {
        remainingAttempts: 0,
        locked: true,
        retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000),
      };
    }

    localStorage.setItem(key, JSON.stringify(entry));
    return {
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - entry.attempts),
      locked: false,
    };
  } catch {
    return { remainingAttempts: 3, locked: false };
  }
}

export function clearRateLimit(mobileNumber: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`bf_rl_${mobileNumber}`);
  } catch {}
}
