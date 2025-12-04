import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                status: true,
                bio: true,
                email: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}

// DELETE - Delete/leave conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is part of conversation
    const conversationUser = await prisma.conversationUser.findFirst({
      where: {
        conversationId: params.conversationId,
        userId: session.user.id,
      },
    });

    if (!conversationUser) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Remove user from conversation (soft delete)
    await prisma.conversationUser.delete({
      where: {
        id: conversationUser.id,
      },
    });

    // Check if conversation has no more users
    const remainingUsers = await prisma.conversationUser.count({
      where: {
        conversationId: params.conversationId,
      },
    });

    // If no users left, delete the conversation and its messages
    if (remainingUsers === 0) {
      await prisma.$transaction([
        prisma.message.deleteMany({
          where: { conversationId: params.conversationId },
        }),
        prisma.readReceipt.deleteMany({
          where: {
            message: {
              conversationId: params.conversationId,
            },
          },
        }),
        prisma.conversation.delete({
          where: { id: params.conversationId },
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}

// PUT - Update conversation (mute, archive, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, value } = body;

    // Check if user is part of conversation
    const conversationUser = await prisma.conversationUser.findFirst({
      where: {
        conversationId: params.conversationId,
        userId: session.user.id,
      },
    });

    if (!conversationUser) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    switch (action) {
      case "mute":
        await prisma.conversationUser.update({
          where: { id: conversationUser.id },
          data: { isMuted: value ?? true },
        });
        break;

      case "archive":
        await prisma.conversationUser.update({
          where: { id: conversationUser.id },
          data: { isArchived: value ?? true },
        });
        break;

      case "pin":
        await prisma.conversationUser.update({
          where: { id: conversationUser.id },
          data: { isPinned: value ?? true },
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}

// POST - Clear chat messages
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Check if user is part of conversation
    const conversationUser = await prisma.conversationUser.findFirst({
      where: {
        conversationId: params.conversationId,
        userId: session.user.id,
      },
    });

    if (!conversationUser) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (action === "clear") {
      // Store the clear timestamp for this user - messages before this won't be shown
      await prisma.conversationUser.update({
        where: { id: conversationUser.id },
        data: { clearedAt: new Date() },
      });

      return NextResponse.json({ success: true, message: "Chat cleared" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error clearing conversation:", error);
    return NextResponse.json({ error: "Failed to clear conversation" }, { status: 500 });
  }
}
