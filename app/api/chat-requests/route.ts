import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch chat requests for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';

    let where: any = {};
    
    if (type === 'sent') {
      where.senderId = session.user.id;
    } else if (type === 'received') {
      where.receiverId = session.user.id;
    } else {
      where.OR = [
        { senderId: session.user.id },
        { receiverId: session.user.id },
      ];
    }

    const requests = await prisma.chatRequest.findMany({
      where,
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
        senderId: true,
        receiverId: true,
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching chat requests:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

// POST - Send a new chat request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, message } = body;

    if (!receiverId) {
      return NextResponse.json({ error: "Receiver ID is required" }, { status: 400 });
    }

    if (receiverId === session.user.id) {
      return NextResponse.json({ error: "Cannot send request to yourself" }, { status: 400 });
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for existing connection (already accepted)
    const existingAccepted = await prisma.chatRequest.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { senderId: session.user.id, receiverId },
          { senderId: receiverId, receiverId: session.user.id },
        ],
      },
    });

    if (existingAccepted) {
      return NextResponse.json({ error: "Already connected with this user" }, { status: 400 });
    }

    // Check for pending request
    const existingPending = await prisma.chatRequest.findFirst({
      where: {
        status: 'pending',
        OR: [
          { senderId: session.user.id, receiverId },
          { senderId: receiverId, receiverId: session.user.id },
        ],
      },
    });

    if (existingPending) {
      return NextResponse.json({ error: "A pending request already exists" }, { status: 400 });
    }

    // Check request limit (3 per year per user)
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);

    const requestsThisYear = await prisma.chatRequest.count({
      where: {
        senderId: session.user.id,
        receiverId,
        createdAt: {
          gte: yearStart,
        },
      },
    });

    if (requestsThisYear >= 3) {
      return NextResponse.json(
        { error: "You have reached the maximum of 3 requests per year for this user" },
        { status: 429 }
      );
    }

    // Create the request
    const chatRequest = await prisma.chatRequest.create({
      data: {
        senderId: session.user.id,
        receiverId,
        message: message?.trim().slice(0, 500) || null,
        status: 'pending',
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      request: chatRequest,
      remainingRequests: 2 - requestsThisYear,
    });
  } catch (error) {
    console.error("Error creating chat request:", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}

// PATCH - Accept or reject a chat request (alternative to [requestId] route)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: "Request ID and action are required" }, { status: 400 });
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const chatRequest = await prisma.chatRequest.findUnique({
      where: { id: requestId },
    });

    if (!chatRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (chatRequest.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized to respond to this request" }, { status: 403 });
    }

    if (chatRequest.status !== 'pending') {
      return NextResponse.json({ error: "Request already responded to" }, { status: 400 });
    }

    const updatedRequest = await prisma.chatRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'accept' ? 'accepted' : 'rejected',
        respondedAt: new Date(),
      },
      include: {
        sender: { select: { id: true, name: true, email: true, image: true } },
        receiver: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // If accepted, create a conversation
    if (action === 'accept') {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { users: { some: { userId: session.user.id } } },
            { users: { some: { userId: chatRequest.senderId } } },
          ],
        },
      });

      if (!existingConversation) {
        await prisma.conversation.create({
          data: {
            isGroup: false,
            users: {
              create: [
                { userId: session.user.id, role: 'member' },
                { userId: chatRequest.senderId, role: 'member' },
              ],
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error("Error responding to chat request:", error);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
