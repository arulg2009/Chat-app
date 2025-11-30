import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface GroupMemberType {
  userId: string;
  role: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
    status?: string;
  };
}

// GET /api/groups/[groupId] - Get group details
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                status: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
        messages: {
          take: 50,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if user can access this group
    const isMember = group.members.some((m: GroupMemberType) => m.userId === session.user.id);
    if (group.isPrivate && !isMember) {
      return NextResponse.json(
        { error: "You don't have access to this group" },
        { status: 403 }
      );
    }

    // Reverse messages to show oldest first
    group.messages.reverse();

    return NextResponse.json({
      ...group,
      isMember,
      userRole: group.members.find((m: GroupMemberType) => m.userId === session.user.id)?.role,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    );
  }
}

// PATCH /api/groups/[groupId] - Update group
export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = params;
    const body = await request.json();

    // Check if user is admin/creator
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership || !["creator", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only admins can update group settings" },
        { status: 403 }
      );
    }

    const { name, description, image, isPrivate, maxMembers } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (image !== undefined) updateData.image = image;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (maxMembers !== undefined) updateData.maxMembers = maxMembers;

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[groupId] - Delete group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = params;

    // Check if user is the creator
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the creator can delete this group" },
        { status: 403 }
      );
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    );
  }
}

// POST /api/groups/[groupId] - Join group or manage members
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = params;
    const body = await request.json();
    const { action, userId, role } = body;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Handle different actions
    switch (action) {
      case "join": {
        // Check if group is private
        if (group.isPrivate) {
          return NextResponse.json(
            { error: "This is a private group. You need an invitation to join." },
            { status: 403 }
          );
        }

        // Check if group is full
        if (group._count.members >= group.maxMembers) {
          return NextResponse.json(
            { error: "This group is full" },
            { status: 400 }
          );
        }

        // Check if already a member
        const existingMember = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: session.user.id,
              groupId,
            },
          },
        });

        if (existingMember) {
          return NextResponse.json(
            { error: "You are already a member of this group" },
            { status: 400 }
          );
        }

        const newMember = await prisma.groupMember.create({
          data: {
            userId: session.user.id,
            groupId,
            role: "member",
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

        return NextResponse.json(newMember, { status: 201 });
      }

      case "leave": {
        // Creator cannot leave
        if (group.creatorId === session.user.id) {
          return NextResponse.json(
            { error: "Group creator cannot leave. Transfer ownership or delete the group." },
            { status: 400 }
          );
        }

        await prisma.groupMember.delete({
          where: {
            userId_groupId: {
              userId: session.user.id,
              groupId,
            },
          },
        });

        return NextResponse.json({ success: true });
      }

      case "add-member": {
        // Check if current user is admin/creator
        const membership = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: session.user.id,
              groupId,
            },
          },
        });

        if (!membership || !["creator", "admin"].includes(membership.role)) {
          return NextResponse.json(
            { error: "Only admins can add members" },
            { status: 403 }
          );
        }

        // Check if group is full
        if (group._count.members >= group.maxMembers) {
          return NextResponse.json(
            { error: "This group is full" },
            { status: 400 }
          );
        }

        const addedMember = await prisma.groupMember.create({
          data: {
            userId,
            groupId,
            role: "member",
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

        return NextResponse.json(addedMember, { status: 201 });
      }

      case "remove-member": {
        // Check if current user is admin/creator
        const membership = await prisma.groupMember.findUnique({
          where: {
            userId_groupId: {
              userId: session.user.id,
              groupId,
            },
          },
        });

        if (!membership || !["creator", "admin"].includes(membership.role)) {
          return NextResponse.json(
            { error: "Only admins can remove members" },
            { status: 403 }
          );
        }

        // Cannot remove creator
        if (userId === group.creatorId) {
          return NextResponse.json(
            { error: "Cannot remove the group creator" },
            { status: 400 }
          );
        }

        await prisma.groupMember.delete({
          where: {
            userId_groupId: {
              userId,
              groupId,
            },
          },
        });

        return NextResponse.json({ success: true });
      }

      case "update-role": {
        // Only creator can update roles
        if (group.creatorId !== session.user.id) {
          return NextResponse.json(
            { error: "Only the group creator can update roles" },
            { status: 403 }
          );
        }

        if (!["admin", "member"].includes(role)) {
          return NextResponse.json(
            { error: "Invalid role" },
            { status: 400 }
          );
        }

        const updatedMember = await prisma.groupMember.update({
          where: {
            userId_groupId: {
              userId,
              groupId,
            },
          },
          data: { role },
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
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error managing group:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
