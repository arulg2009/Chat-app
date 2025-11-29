import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Check connection status with a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId: otherUserId } = params;

    // Check for accepted connection
    const acceptedRequest = await prisma.chatRequest.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id },
        ],
      },
    });

    if (acceptedRequest) {
      // Get the conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { users: { some: { userId: session.user.id } } },
            { users: { some: { userId: otherUserId } } },
          ],
        },
      });

      return NextResponse.json({
        status: 'connected',
        canChat: true,
        conversationId: conversation?.id || null,
      });
    }

    // Check for pending request
    const pendingRequest = await prisma.chatRequest.findFirst({
      where: {
        status: 'pending',
        OR: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id },
        ],
      },
    });

    if (pendingRequest) {
      return NextResponse.json({
        status: 'pending',
        canChat: false,
        requestId: pendingRequest.id,
        isSender: pendingRequest.senderId === session.user.id,
      });
    }

    // Check remaining requests this year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const requestsThisYear = await prisma.chatRequest.count({
      where: {
        senderId: session.user.id,
        receiverId: otherUserId,
        createdAt: {
          gte: oneYearAgo,
        },
      },
    });

    return NextResponse.json({
      status: 'not_connected',
      canChat: false,
      canSendRequest: requestsThisYear < 3,
      remainingRequests: Math.max(0, 3 - requestsThisYear),
    });
  } catch (error) {
    console.error("Error checking connection status:", error);
    return NextResponse.json(
      { error: "Failed to check connection status" },
      { status: 500 }
    );
  }
}
