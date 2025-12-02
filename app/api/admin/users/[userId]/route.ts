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

// GET /api/admin/users/[userId] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: {
        _count: {
          select: {
            sentMessages: true,
            groupMessages: true,
            groupMemberships: true,
            createdGroups: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Admin error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[userId] - Delete a specific user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = params;

    // Prevent deleting self
    if (userId === session?.user?.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    // Check if user exists and is not an admin
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "admin") {
      return NextResponse.json({ error: "Cannot delete another admin" }, { status: 403 });
    }

    // Delete the user (cascades to related data)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ 
      message: `User "${targetUser.name}" deleted successfully` 
    });
  } catch (error) {
    console.error("Admin error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

// PATCH /api/admin/users/[userId] - Update user (remove photo, change role, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = params;
    const body = await request.json();
    const { action, ...data } = body;

    // Handle specific actions
    if (action === "removePhoto") {
      await prisma.user.update({
        where: { id: userId },
        data: { image: null },
      });
      return NextResponse.json({ message: "Profile photo removed" });
    }

    if (action === "clearMessages") {
      // Delete all messages from this user
      const [directMsgs, groupMsgs] = await Promise.all([
        prisma.message.deleteMany({ where: { senderId: userId } }),
        prisma.groupMessage.deleteMany({ where: { senderId: userId } }),
      ]);
      return NextResponse.json({ 
        message: `Deleted ${directMsgs.count + groupMsgs.count} messages` 
      });
    }

    // General update
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true, image: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
