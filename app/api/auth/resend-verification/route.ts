import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOTP, sendVerificationOTP } from "@/lib/email";

// Rate limit: 1 OTP per minute
const RESEND_COOLDOWN = 60 * 1000; // 60 seconds

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json({
        success: true,
        message: "If an account exists, a verification code will be sent.",
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified. Please sign in." },
        { status: 400 }
      );
    }

    // Check for recent OTP (rate limiting)
    const recentOtp = await prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        type: "verification",
        createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN) },
      },
    });

    if (recentOtp) {
      const waitTime = Math.ceil(
        (RESEND_COOLDOWN - (Date.now() - recentOtp.createdAt.getTime())) / 1000
      );
      return NextResponse.json(
        { 
          error: `Please wait ${waitTime} seconds before requesting a new code.`,
          waitTime,
        },
        { status: 429 }
      );
    }

    // Delete old OTPs for this email
    await prisma.emailOtp.deleteMany({
      where: { email: normalizedEmail, type: "verification" },
    });

    // Generate new OTP
    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP
    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        code: otp,
        type: "verification",
        expires,
      },
    });

    // Send OTP email
    const emailSent = await sendVerificationOTP({
      to: normalizedEmail,
      otp,
      name: user.name || undefined,
    });

    if (!emailSent) {
      console.log("=================================");
      console.log("EMAIL SENDING FAILED - DEV MODE");
      console.log(`Email: ${normalizedEmail}`);
      console.log(`OTP: ${otp}`);
      console.log("=================================");
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email.",
      // Include OTP in development for testing
      ...(process.env.NODE_ENV === "development" && !emailSent && { 
        devOtp: otp,
        note: "OTP shown because email sending failed (dev mode)" 
      }),
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
