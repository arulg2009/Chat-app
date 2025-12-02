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

// GET /api/admin/groups/[groupId] - Get group details
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const group = await prisma.group.findUnique({
      where: { id: params.groupId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        _count: { select: { messages: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Admin error:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

// DELETE /api/admin/groups/[groupId] - Delete a specific group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const group = await prisma.group.findUnique({
      where: { id: params.groupId },
      select: { name: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    await prisma.group.delete({
      where: { id: params.groupId },
    });

    return NextResponse.json({ 
      message: `Group "${group.name}" deleted successfully` 
    });
  } catch (error) {
    console.error("Admin error:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}

// PATCH /api/admin/groups/[groupId] - Update group or remove member
export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!await isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { groupId } = params;
    const body = await request.json();
    const { action, userId, ...data } = body;

    if (action === "removeMember" && userId) {
      await prisma.groupMember.delete({
        where: {
          userId_groupId: { userId, groupId },
        },
      });
      return NextResponse.json({ message: "Member removed from group" });
    }

    if (action === "clearMessages") {
      const result = await prisma.groupMessage.deleteMany({
        where: { groupId },
      });
      return NextResponse.json({ 
        message: `Deleted ${result.count} messages from group` 
      });
    }

    // General update
    const updated = await prisma.group.update({
      where: { id: groupId },
      data,
      select: { id: true, name: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}
