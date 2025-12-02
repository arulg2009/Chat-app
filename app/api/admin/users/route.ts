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

// GET /api/admin/users - Get all users with stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        lastSeen: true,
        createdAt: true,
        _count: {
          select: {
            sentMessages: true,
            groupMessages: true,
            groupMemberships: true,
            createdGroups: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      totalUsers: users.length,
      onlineUsers: users.filter(u => u.status === "online").length,
      totalGroups: await prisma.group.count(),
      totalMessages: await prisma.message.count() + await prisma.groupMessage.count(),
    };

    return NextResponse.json({ users, stats });
  } catch (error) {
    console.error("Admin error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// DELETE /api/admin/users - Delete all users (except admin)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    // Delete all users except the admin
    const result = await prisma.user.deleteMany({
      where: {
        role: { not: "admin" },
      },
    });

    return NextResponse.json({ 
      message: `Deleted ${result.count} users`,
      count: result.count 
    });
  } catch (error) {
    console.error("Admin error:", error);
    return NextResponse.json({ error: "Failed to delete users" }, { status: 500 });
  }
}
