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
    let notificationError = null;

    if (oneSignalAppId) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
      };

      if (oneSignalApiKey) {
        headers["Authorization"] = `Basic ${oneSignalApiKey.trim()}`;
      }

      // Build payload target
      const payload: Record<string, any> = {
        app_id: oneSignalAppId,
        headings: { en: "Brother's Fitness Verification Code" },
        contents: {
          en: `Your Brother's Fitness login OTP is: ${otp}. Do not share it with anyone.`,
        },
      };

      if (subscriptionId) {
        payload["include_subscription_ids"] = [subscriptionId];
      } else if (playerId) {
        payload["include_player_ids"] = [playerId];
      } else {
        payload["included_segments"] = ["Subscribed Users", "Total Subscriptions"];
      }

      try {
        const osRes = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const osData = await osRes.json();
        console.log("OneSignal API response:", osData);

        if (osRes.ok && !osData.errors) {
          notificationSent = true;
        } else {
          notificationError = osData.errors || "OneSignal API returned error";
          console.warn("OneSignal warning/error:", osData);
        }
      } catch (err: any) {
        console.error("Failed to call OneSignal API:", err);
        notificationError = err?.message || "Failed to trigger OneSignal API";
      }
    }

    return NextResponse.json({
      success: true,
      message: "OTP saved to Firebase 'otp' collection",
      mobileNumber: cleanedMobile,
      notificationSent,
      notificationError,
      requiresRestApiKey: !oneSignalApiKey,
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process OTP request" },
      { status: 500 }
    );
  }
}
