import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateOTP, sendVerificationOTP } from "@/lib/email";

// Input sanitization helper
function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, realName, nickname, name } = body;

    // Support both old (name) and new (realName/nickname) field formats
    const effectiveRealName = realName || name;
    const effectiveNickname = nickname || name;

    // Validate required fields
    if (!email || !password || !effectiveRealName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedRealName = sanitizeInput(effectiveRealName);
    const sanitizedNickname = sanitizeInput(effectiveNickname);
    const sanitizedEmail = email.toLowerCase().trim();

    // Validate real name
    if (sanitizedRealName.length < 2) {
      return NextResponse.json(
        { error: "Real name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (sanitizedRealName.length > 100) {
      return NextResponse.json(
        { error: "Real name is too long" },
        { status: 400 }
      );
    }

    // Validate nickname
    if (sanitizedNickname.length < 2) {
      return NextResponse.json(
        { error: "Nickname must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (sanitizedNickname.length > 50) {
      return NextResponse.json(
        { error: "Nickname is too long" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Password is too long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      // If user exists but not verified, allow re-sending OTP
      if (!existingUser.emailVerified) {
        // Delete old OTPs for this email
        await prisma.emailOtp.deleteMany({
          where: { email: sanitizedEmail, type: "verification" },
        });

        // Generate new OTP
        const otp = generateOTP();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP
        await prisma.emailOtp.create({
          data: {
            email: sanitizedEmail,
            code: otp,
            type: "verification",
            expires,
          },
        });

        // Send OTP email
        const emailSent = await sendVerificationOTP({
          to: sanitizedEmail,
          otp,
          name: sanitizedNickname,
        });

        if (!emailSent) {
          console.log(`[DEV] Verification OTP for ${sanitizedEmail}: ${otp}`);
        }

        return NextResponse.json({
          success: true,
          message: "Verification code sent to your email",
          requiresVerification: true,
        });
      }

      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password with strong salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (unverified)
    const user = await prisma.user.create({
      data: {
        email: sanitizedEmail,
        name: sanitizedNickname,
        realName: sanitizedRealName,
        password: hashedPassword,
        status: "offline",
        emailVerified: null,
      },
    });

    // Generate OTP
    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTPs for this email
    await prisma.emailOtp.deleteMany({
      where: { email: sanitizedEmail, type: "verification" },
    });

    // Save OTP
    await prisma.emailOtp.create({
      data: {
        email: sanitizedEmail,
        code: otp,
        type: "verification",
        expires,
      },
    });

    // Send OTP email
    const emailSent = await sendVerificationOTP({
      to: sanitizedEmail,
      otp,
      name: sanitizedNickname,
    });

    if (!emailSent) {
      // Log OTP for development/testing when email fails
      console.log("=================================");
      console.log("EMAIL SENDING FAILED - DEV MODE");
      console.log(`Email: ${sanitizedEmail}`);
      console.log(`OTP: ${otp}`);
      console.log("=================================");
    }

    return NextResponse.json({
      success: true,
      message: "Account created! Please verify your email with the OTP sent.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      requiresVerification: true,
      // Include OTP in development for testing
      ...(process.env.NODE_ENV === "development" && !emailSent && { 
        devOtp: otp,
        note: "OTP shown because email sending failed (dev mode)" 
      }),
    });
  } catch (error: any) {
    console.error("Registration error:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
