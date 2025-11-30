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
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            type: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Format response - match the format expected by dashboard
    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      name: conv.name,
      isGroup: conv.isGroup,
      updatedAt: conv.updatedAt,
      users: conv.users.map((u) => ({
        user: {
          id: u.user.id,
          name: u.user.name,
          image: u.user.image,
          status: u.user.status,
        },
      })),
      messages: conv.messages.map((m) => ({
        content: m.content,
        type: m.type,
        createdAt: m.createdAt,
        sender: { name: null }, // Sender info not included in the query
      })),
    }));

    return NextResponse.json(formattedConversations);
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

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        name: isGroup ? name : null,
        isGroup,
        users: {
          create: [
            { userId: session.user.id, role: isGroup ? 'admin' : 'member' },
            ...participantIds.map((id: string) => ({
              userId: id,
              role: 'member',
            })),
          ],
        },
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

    return NextResponse.json({
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      participants: conversation.users
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
