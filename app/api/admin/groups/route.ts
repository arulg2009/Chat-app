import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Admin check middleware
async function isAdmin(session: any) {
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "admin";
}

// GET /api/admin/groups - Get all groups
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const groups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
        isPrivate: true,
        createdAt: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Admin error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

// DELETE /api/admin/groups - Delete all groups
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const result = await prisma.group.deleteMany({});

    return NextResponse.json({ 
      message: `Deleted ${result.count} groups`,
      count: result.count 
    });
  } catch (error) {
    console.error("Admin error:", error);
    return NextResponse.json({ error: "Failed to delete groups" }, { status: 500 });
  }
}
