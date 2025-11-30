import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/groups/[groupId]/members/[memberId] - Update member role or mute
export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, memberId } = params;
    const body = await request.json();
    const { role, mutedUntil, nickname } = body;

    // Check if requester is admin/owner
    const requesterMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!requesterMembership || !["admin", "owner"].includes(requesterMembership.role)) {
      return NextResponse.json(
        { error: "Only admins can modify members" },
        { status: 403 }
      );
    }

    // Get target member
    const targetMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: memberId,
          groupId,
        },
      },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Only owner can change admin roles
    if (role && role !== targetMember.role) {
      if (requesterMembership.role !== "owner") {
        return NextResponse.json(
          { error: "Only owners can change roles" },
          { status: 403 }
        );
      }
      if (targetMember.role === "owner") {
        return NextResponse.json(
          { error: "Cannot demote the owner" },
          { status: 403 }
        );
      }
    }

    const updatedMember = await prisma.groupMember.update({
      where: {
        userId_groupId: {
          userId: memberId,
          groupId,
        },
      },
      data: {
        ...(role && { role }),
        ...(mutedUntil !== undefined && { mutedUntil: mutedUntil ? new Date(mutedUntil) : null }),
        ...(nickname !== undefined && { nickname }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[groupId]/members/[memberId] - Remove/kick a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, memberId } = params;

    // Check if requester is admin/owner
    const requesterMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!requesterMembership || !["admin", "owner"].includes(requesterMembership.role)) {
      return NextResponse.json(
        { error: "Only admins can kick members" },
        { status: 403 }
      );
    }

    // Get target member
    const targetMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: memberId,
          groupId,
        },
      },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Cannot kick owner
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Cannot kick the owner" },
        { status: 403 }
      );
    }

    // Admins can only kick regular members
    if (requesterMembership.role === "admin" && targetMember.role === "admin") {
      return NextResponse.json(
        { error: "Admins cannot kick other admins" },
        { status: 403 }
      );
    }

    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId: memberId,
          groupId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error kicking member:", error);
    return NextResponse.json(
      { error: "Failed to kick member" },
      { status: 500 }
    );
  }
}
