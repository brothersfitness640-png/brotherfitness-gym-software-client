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

    return NextResponse.json({
      success: true,
      message: "OTP generated and saved to Firebase successfully",
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
