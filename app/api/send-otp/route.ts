import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const { mobileNumber, otp } = await request.json();

    if (!mobileNumber || !otp) {
      return NextResponse.json(
        { error: "Mobile number and OTP are required" },
        { status: 400 }
      );
    }

    // Clean mobile number format (e.g., numbers only)
    const cleanedMobile = mobileNumber.replace(/\D/g, "");

    // Save OTP into Firebase Firestore in 'otp' collection with document ID = mobileNumber
    const otpRef = doc(db, "otp", cleanedMobile);
    await setDoc(otpRef, {
      otp: String(otp),
      mobileNumber: cleanedMobile,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Send OneSignal Push Notification (if configured)
    const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID;
    const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (oneSignalAppId && oneSignalApiKey) {
      try {
        await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Basic ${oneSignalApiKey}`,
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            included_segments: ["Subscribed Users"],
            headings: { en: "Brother's Fitness Verification Code" },
            contents: {
              en: `Your Brother's Fitness login OTP is: ${otp}. Do not share it with anyone.`,
            },
          }),
        });
      } catch (oneSignalError) {
        console.error("OneSignal notification error:", oneSignalError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent and saved to Firebase successfully",
      mobileNumber: cleanedMobile,
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process OTP request" },
      { status: 500 }
    );
  }
}
