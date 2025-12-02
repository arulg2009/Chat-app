import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    const users = await prisma.user.findMany({
      where: session?.user?.id ? {
        id: { not: session.user.id }, // Exclude current user
      } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        status: true,
        lastSeen: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
