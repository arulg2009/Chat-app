import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Helper to generate verification token
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// POST /api/auth/resend-verification - Resend verification email
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
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a verification link will be sent.",
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Delete any existing tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    // Generate new token
    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires,
      },
    });

    // In production, send email here
    // For now, log the verification link (in development)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;
    
    console.log("=================================");
    console.log("VERIFICATION EMAIL");
    console.log(`To: ${normalizedEmail}`);
    console.log(`Link: ${verificationUrl}`);
    console.log("=================================");

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // await sendVerificationEmail(normalizedEmail, verificationUrl);

    return NextResponse.json({
      success: true,
      message: "Verification email sent",
      // Only include in development for testing
      ...(process.env.NODE_ENV === "development" && { 
        verificationUrl,
        note: "This URL is only shown in development mode" 
      }),
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
