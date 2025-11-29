import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_REQUESTS_PER_YEAR = 3;

// GET - Fetch chat requests (sent and received)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all'; // 'sent', 'received', 'all'

    let where = {};
    
    if (type === 'sent') {
      where = { senderId: session.user.id };
    } else if (type === 'received') {
      where = { receiverId: session.user.id };
    } else {
      where = {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
        ],
      };
    }

    const requests = await prisma.chatRequest.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching chat requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat requests" },
      { status: 500 }
    );
  }
}

// POST - Send a chat request
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
    const { receiverId, message } = body;

    if (!receiverId) {
      return NextResponse.json(
        { error: "Receiver ID is required" },
        { status: 400 }
      );
    }

    if (receiverId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot send a request to yourself" },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if there's already an accepted request (either direction)
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
      return NextResponse.json(
        { error: "You already have an accepted chat connection with this user" },
        { status: 400 }
      );
    }

    // Check if there's a pending request
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
      return NextResponse.json(
        { error: "There is already a pending request between you and this user" },
        { status: 400 }
      );
    }

    // Check yearly request limit (3 requests per user per year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const requestsThisYear = await prisma.chatRequest.count({
      where: {
        senderId: session.user.id,
        receiverId,
        createdAt: {
          gte: oneYearAgo,
        },
      },
    });

    if (requestsThisYear >= MAX_REQUESTS_PER_YEAR) {
      return NextResponse.json(
        { 
          error: `You have reached the maximum limit of ${MAX_REQUESTS_PER_YEAR} requests per year for this user`,
          remainingRequests: 0,
        },
        { status: 429 }
      );
    }

    // Create the chat request
    const chatRequest = await prisma.chatRequest.create({
      data: {
        senderId: session.user.id,
        receiverId,
        message: message?.trim().slice(0, 500) || null,
        status: 'pending',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      request: chatRequest,
      remainingRequests: MAX_REQUESTS_PER_YEAR - requestsThisYear - 1,
    });
  } catch (error) {
    console.error("Error creating chat request:", error);
    return NextResponse.json(
      { error: "Failed to send chat request" },
      { status: 500 }
    );
  }
}
