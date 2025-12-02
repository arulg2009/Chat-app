import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/groups/[groupId]/members - Join a group
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

    // Faster: Run checks in parallel
    const [group, existingMembership, memberCount] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        select: { id: true, isPrivate: true, maxMembers: true },
      }),
      prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: session.user.id, groupId } },
        select: { userId: true },
      }),
      prisma.groupMember.count({ where: { groupId } }),
    ]);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (existingMembership) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }

    if (group.isPrivate) {
      return NextResponse.json(
        { error: "This is a private group. You need an invitation to join." },
        { status: 403 }
      );
    }

    if (group.maxMembers && memberCount >= group.maxMembers) {
      return NextResponse.json(
        { error: "Group has reached maximum member limit" },
        { status: 400 }
      );
    }

    const membership = await prisma.groupMember.create({
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

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[groupId]/members - Leave a group
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

    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 400 }
      );
    }

    // Check if user is the owner
    if (membership.role === "owner") {
      // Count other admins or owners
      const adminCount = await prisma.groupMember.count({
        where: {
          groupId,
          role: { in: ["owner", "admin"] },
          userId: { not: session.user.id },
        },
      });

      if (adminCount === 0) {
        return NextResponse.json(
          { error: "Transfer ownership before leaving" },
          { status: 400 }
        );
      }
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
  } catch (error) {
    console.error("Error leaving group:", error);
    return NextResponse.json(
      { error: "Failed to leave group" },
      { status: 500 }
    );
  }
}

// PUT /api/groups/[groupId]/members - Add a member to group (admin only)
export async function PUT(
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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if current user is admin of the group
    const currentMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!currentMembership || !['owner', 'admin', 'creator'].includes(currentMembership.role)) {
      return NextResponse.json(
        { error: "Only admins can add members" },
        { status: 403 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already a member
    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 });
    }

    // Check group member limit
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });

    if (group && group.maxMembers && group._count.members >= group.maxMembers) {
      return NextResponse.json(
        { error: "Group has reached maximum member limit" },
        { status: 400 }
      );
    }

    // Add the member
    const membership = await prisma.groupMember.create({
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
            status: true,
          },
        },
      },
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

// GET /api/groups/[groupId]/members - Get group members
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
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                status: true,
                lastSeen: true,
              },
            },
          },
          orderBy: [
            { role: "asc" },
            { joinedAt: "asc" },
          ],
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check access
    const isMember = group.members.some((m) => m.userId === session.user.id);
    if (group.isPrivate && !isMember) {
      return NextResponse.json(
        { error: "You don't have access to this group" },
        { status: 403 }
      );
    }

    return NextResponse.json(group.members);
  } catch (error) {
    console.error("Error fetching group members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
