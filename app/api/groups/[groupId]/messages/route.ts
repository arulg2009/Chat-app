import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/groups/[groupId]/messages - Send a message to a group
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
    const { content, type = "text", replyToId, isForwarded, metadata } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Check if user is a member of the group
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
        { status: 403 }
      );
    }

    // Check if user is muted
    if (membership.mutedUntil && new Date(membership.mutedUntil) > new Date()) {
      return NextResponse.json(
        { error: "You are muted in this group" },
        { status: 403 }
      );
    }

    // Build create data - only include fields that exist in the schema
    const createData: any = {
      content: content.trim(),
      type,
      senderId: session.user.id,
      groupId,
    };

    // Try to include optional fields if they exist in schema
    if (replyToId) {
      // Validate replyToId if provided
      const replyMessage = await prisma.groupMessage.findFirst({
        where: {
          id: replyToId,
          groupId,
        },
      });
      if (replyMessage) {
        createData.replyToId = replyToId;
      }
    }

    if (isForwarded !== undefined) {
      createData.isForwarded = !!isForwarded;
    }

    if (metadata) {
      createData.metadata = metadata;
    }

    const message = await prisma.groupMessage.create({
      data: createData,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error sending group message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// GET /api/groups/[groupId]/messages - Get group messages
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before");

    // Check if user can access this group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isMember = group.members.length > 0;
    if (group.isPrivate && !isMember) {
      return NextResponse.json(
        { error: "You don't have access to this group" },
        { status: 403 }
      );
    }

    const messages = await prisma.groupMessage.findMany({
      where: {
        groupId,
        ...(before && { createdAt: { lt: new Date(before) } }),
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
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Add empty reactions array for compatibility
    const transformedMessages = messages.map((msg) => ({
      ...msg,
      reactions: [],
      readBy: [],
    }));

    const response = NextResponse.json({ messages: transformedMessages.reverse() });
    
    // Cache for 1 second, stale-while-revalidate for smooth polling
    response.headers.set('Cache-Control', 'private, max-age=1, stale-while-revalidate=2');
    
    return response;
  } catch (error) {
    console.error("Error fetching group messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
