import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const { mobileNumber, otp, playerId, subscriptionId } = await request.json();

    if (!mobileNumber || !otp) {
      return NextResponse.json(
        { error: "Mobile number and OTP are required" },
        { status: 400 }
      );
    }

    // Clean mobile number format (e.g., numbers only)
    const cleanedMobile = mobileNumber.replace(/\D/g, "");

    // 1. Save OTP into Firebase Firestore in 'otp' collection with document ID = mobileNumber
    const otpRef = doc(db, "otp", cleanedMobile);
    await setDoc(otpRef, {
      otp: String(otp),
      mobileNumber: cleanedMobile,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // 2. Send OneSignal Push Notification
    const oneSignalAppId =
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
      "24643e60-bd2d-4e83-820b-b0d2f7078e33";
    const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

    let notificationSent = false;
    let notificationError: any = null;
    let osData: any = null;

    if (oneSignalAppId) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
      };

      if (oneSignalApiKey) {
        const key = oneSignalApiKey.trim();
        if (key.startsWith("os_v2_")) {
          headers["Authorization"] = `Key ${key}`;
        } else {
          headers["Authorization"] = `Basic ${key}`;
        }
      }

      // Base notification message payload
      const basePayload = {
        app_id: oneSignalAppId,
        headings: { en: "Brother's Fitness Code" },
        contents: {
          en: `Your Brother's Fitness verification code is: ${otp}. Do not share it.`,
        },
      };

      // Helper function to send notification attempt
      const sendAttempt = async (targetPayload: Record<string, any>) => {
        const res = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers,
          body: JSON.stringify({ ...basePayload, ...targetPayload }),
        });
        const data = await res.json();
        return { ok: res.ok, data };
      };

      // Attempt 1: Target specific subscription ID if provided
      if (subscriptionId) {
        const attempt1 = await sendAttempt({
          include_subscription_ids: [subscriptionId],
        });
        osData = attempt1.data;
        if (attempt1.ok && !attempt1.data?.errors) {
          notificationSent = true;
        }
      }

      // Attempt 2: Target player ID if provided and Attempt 1 didn't succeed
      if (!notificationSent && playerId) {
        const attempt2 = await sendAttempt({
          include_player_ids: [playerId],
        });
        osData = attempt2.data;
        if (attempt2.ok && !attempt2.data?.errors) {
          notificationSent = true;
        }
      }

      // Attempt 3: Fallback to Subscribed Users segment
      if (!notificationSent) {
        const attempt3 = await sendAttempt({
          included_segments: ["Subscribed Users"],
        });
        osData = attempt3.data;
        if (attempt3.ok && !attempt3.data?.errors) {
          notificationSent = true;
        } else {
          // Attempt 4: Fallback to Total Subscriptions / Active Users
          const attempt4 = await sendAttempt({
            included_segments: ["Active Users"],
          });
          osData = attempt4.data;
          if (attempt4.ok && !attempt4.data?.errors) {
            notificationSent = true;
          } else {
            notificationError = attempt4.data?.errors || attempt3.data?.errors || "All subscribers unsubscribed";
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "OTP saved to Firebase 'otp' collection",
      mobileNumber: cleanedMobile,
      notificationSent,
      notificationError,
      oneSignalResponse: osData,
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process OTP request" },
      { status: 500 }
    );
  }
}
