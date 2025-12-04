import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch user's conversations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        isGroup: true,
        updatedAt: true,
        users: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                status: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            content: true,
            createdAt: true,
            type: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50,
    });

    // Return with no-cache headers to prevent stale data
    const response = NextResponse.json(conversations);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    return response;
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { participantIds, name, isGroup = false } = body;

    // Validate participants
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: "At least one participant is required" },
        { status: 400 }
      );
    }

    // For direct messages (non-group), check if conversation already exists
    if (!isGroup && participantIds.length === 1) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { users: { some: { userId: session.user.id } } },
            { users: { some: { userId: participantIds[0] } } },
          ],
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (existingConversation) {
        return NextResponse.json({
          id: existingConversation.id,
          name: existingConversation.name,
          isGroup: existingConversation.isGroup,
          participants: existingConversation.users
            .filter((u) => u.userId !== session.user.id)
            .map((u) => u.user),
          isExisting: true,
        });
      }
    }

    // Create new conversation with separate user creation for reliability
    const conversation = await prisma.conversation.create({
      data: {
        name: isGroup ? name : null,
        isGroup,
      },
    });
    
    // Create conversation users separately
    await prisma.conversationUser.create({
      data: { userId: session.user.id, conversationId: conversation.id, role: isGroup ? 'admin' : 'member' },
    });
    for (const id of participantIds) {
      await prisma.conversationUser.create({
        data: { userId: id, conversationId: conversation.id, role: 'member' },
      });
    }
    
    // Fetch the complete conversation with users
    const fullConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      id: fullConversation!.id,
      name: fullConversation!.name,
      isGroup: fullConversation!.isGroup,
      participants: fullConversation!.users
        .filter((u) => u.userId !== session.user.id)
        .map((u) => u.user),
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
