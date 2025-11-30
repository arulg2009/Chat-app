import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password with strong salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: sanitizedEmail,
        name: sanitizedNickname, // nickname is the display name
        realName: sanitizedRealName, // real name for account recovery
        password: hashedPassword,
        status: "offline",
      },
    });

    // Return success (don't include password in response)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        realName: user.realName,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
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
