import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Update typing status
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = params;
    const { isTyping } = await request.json();

    // Verify user is part of the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Upsert typing indicator
    const indicator = await prisma.typingIndicator.upsert({
      where: {
        userId_conversationId: {
          userId: session.user.id,
          conversationId,
        },
      },
      update: {
        isTyping: !!isTyping,
      },
      create: {
        userId: session.user.id,
        conversationId,
        isTyping: !!isTyping,
      },
    });

    return NextResponse.json(indicator);
  } catch (error) {
    console.error("Error updating typing status:", error);
    return NextResponse.json({ error: "Failed to update typing status" }, { status: 500 });
  }
}

// GET - Get users currently typing
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = params;

    // Get typing indicators updated in the last 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);

    const typingUsers = await prisma.typingIndicator.findMany({
      where: {
        conversationId,
        isTyping: true,
        updatedAt: {
          gte: fiveSecondsAgo,
        },
        userId: {
          not: session.user.id, // Exclude current user
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      typingUsers.map((t) => ({
        userId: t.userId,
        name: t.user.name,
      }))
    );
  } catch (error) {
    console.error("Error fetching typing status:", error);
    return NextResponse.json({ error: "Failed to fetch typing status" }, { status: 500 });
  }
}
