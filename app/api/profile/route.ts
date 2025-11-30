import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/profile - Get current user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        realName: true,
        email: true,
        image: true,
        bio: true,
        hobbies: true,
        location: true,
        website: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        occupation: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT /api/profile - Update current user profile
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      realName,
      bio,
      hobbies,
      location,
      website,
      phone,
      dateOfBirth,
      gender,
      occupation,
      image,
    } = body;

    // Validate name
    if (name && (name.length < 2 || name.length > 50)) {
      return NextResponse.json(
        { error: "Name must be between 2 and 50 characters" },
        { status: 400 }
      );
    }

    // Validate bio
    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: "Bio must be less than 500 characters" },
        { status: 400 }
      );
    }

    // Validate website URL
    if (website && website.trim()) {
      try {
        new URL(website);
      } catch {
        return NextResponse.json(
          { error: "Invalid website URL" },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name: name?.trim() || undefined }),
        ...(realName !== undefined && { realName: realName?.trim() || null }),
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(hobbies !== undefined && { hobbies: hobbies?.trim() || null }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(website !== undefined && { website: website?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(gender !== undefined && { gender: gender || null }),
        ...(occupation !== undefined && { occupation: occupation?.trim() || null }),
        ...(image !== undefined && { image: image || null }),
      },
      select: {
        id: true,
        name: true,
        realName: true,
        email: true,
        image: true,
        bio: true,
        hobbies: true,
        location: true,
        website: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        occupation: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
