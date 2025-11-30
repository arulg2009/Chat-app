import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;

// POST /api/auth/verify-email - Verify email with OTP
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOtp = otp.trim();

    // Find the OTP record
    const otpRecord = await prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        type: "verification",
        verified: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > otpRecord.expires) {
      await prisma.emailOtp.delete({ where: { id: otpRecord.id } });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await prisma.emailOtp.delete({ where: { id: otpRecord.id } });
      return NextResponse.json(
        { error: "Too many attempts. Please request a new verification code." },
        { status: 429 }
      );
    }

    // Verify OTP
    if (otpRecord.code !== normalizedOtp) {
      // Increment attempts
      await prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });

      const remainingAttempts = MAX_ATTEMPTS - otpRecord.attempts - 1;
      return NextResponse.json(
        { 
          error: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    // OTP is valid - verify the user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Mark OTP as verified and delete it
    await prisma.emailOtp.delete({ where: { id: otpRecord.id } });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You can now sign in.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}

// GET /api/auth/verify-email - Check if email is verified
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { emailVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verified: !!user.emailVerified,
    });
  } catch (error) {
    console.error("Check verification error:", error);
    return NextResponse.json(
      { error: "Failed to check verification status" },
      { status: 500 }
    );
  }
}
