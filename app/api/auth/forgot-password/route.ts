import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Input sanitization helper
function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, realName, newPassword, step } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const sanitizedEmail = email.toLowerCase().trim();

    // Step 1: Check if email exists
    if (step === "check-email") {
      const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
        select: { id: true, realName: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "No account found with this email address" },
          { status: 404 }
        );
      }

      if (!user.realName) {
        return NextResponse.json(
          { error: "This account doesn't have a recovery name set. Please contact support." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        userId: user.id,
        message: "Account found. Please verify your identity.",
      });
    }

    // Step 2: Verify real name
    if (step === "verify-name") {
      if (!realName) {
        return NextResponse.json(
          { error: "Real name is required for verification" },
          { status: 400 }
        );
      }

      const sanitizedRealName = sanitizeInput(realName);

      const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
        select: { id: true, realName: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "No account found with this email address" },
          { status: 404 }
        );
      }

      // Case-insensitive comparison of real name
      if (!user.realName || user.realName.toLowerCase() !== sanitizedRealName.toLowerCase()) {
        return NextResponse.json(
          { error: "The name you entered doesn't match our records. Please try again." },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Identity verified. You can now reset your password.",
      });
    }

    // Step 3: Reset password
    if (step === "reset-password") {
      if (!realName || !newPassword) {
        return NextResponse.json(
          { error: "All fields are required" },
          { status: 400 }
        );
      }

      const sanitizedRealName = sanitizeInput(realName);

      // Validate password
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      if (newPassword.length > 128) {
        return NextResponse.json(
          { error: "Password is too long" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
        select: { id: true, realName: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "No account found with this email address" },
          { status: 404 }
        );
      }

      // Verify real name again for security
      if (!user.realName || user.realName.toLowerCase() !== sanitizedRealName.toLowerCase()) {
        return NextResponse.json(
          { error: "Verification failed. Please start the process again." },
          { status: 403 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { email: sanitizedEmail },
        data: { password: hashedPassword },
      });

      return NextResponse.json({
        success: true,
        message: "Password reset successfully. You can now sign in with your new password.",
      });
    }

    return NextResponse.json(
      { error: "Invalid step" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
