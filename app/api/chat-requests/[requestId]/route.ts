import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Accept or reject a chat request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { requestId } = params;
    const body = await request.json();
    const { action } = body; // 'accept' or 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    // Find the chat request
    const chatRequest = await prisma.chatRequest.findUnique({
      where: { id: requestId },
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

    if (!chatRequest) {
      return NextResponse.json(
        { error: "Chat request not found" },
        { status: 404 }
      );
    }

    // Only the receiver can accept/reject
    if (chatRequest.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only respond to requests sent to you" },
        { status: 403 }
      );
    }

    if (chatRequest.status !== 'pending') {
      return NextResponse.json(
        { error: "This request has already been responded to" },
        { status: 400 }
      );
    }

    // Use transaction for faster atomic updates
    if (action === 'accept') {
      await prisma.$transaction([
        prisma.chatRequest.update({
          where: { id: requestId },
          data: { status: 'accepted', respondedAt: new Date() },
        }),
        prisma.conversation.create({
          data: {
            isGroup: false,
            users: {
              create: [
                { userId: chatRequest.senderId },
                { userId: chatRequest.receiverId },
              ],
            },
          },
        }),
      ]);
    } else {
      await prisma.chatRequest.update({
        where: { id: requestId },
        data: { status: 'rejected', respondedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating chat request:", error);
    return NextResponse.json(
      { error: "Failed to update chat request" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel a sent request (only sender can cancel)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { requestId } = params;

    const chatRequest = await prisma.chatRequest.findUnique({
      where: { id: requestId },
    });

    if (!chatRequest) {
      return NextResponse.json(
        { error: "Chat request not found" },
        { status: 404 }
      );
    }

    // Only sender can cancel their own pending request
    if (chatRequest.senderId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only cancel your own requests" },
        { status: 403 }
      );
    }

    if (chatRequest.status !== 'pending') {
      return NextResponse.json(
        { error: "Only pending requests can be cancelled" },
        { status: 400 }
      );
    }

    await prisma.chatRequest.delete({ where: { id: requestId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling chat request:", error);
    return NextResponse.json(
      { error: "Failed to cancel chat request" },
      { status: 500 }
    );
  }
}
