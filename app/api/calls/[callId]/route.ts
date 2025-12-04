import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: { callId: string };
}

// GET - Get call details with signaling data
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId } = params;

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        initiator: {
          select: { id: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Check if user is part of this call
    if (call.initiatorId !== session.user.id && call.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ call });
  } catch (error) {
    console.error("Error getting call:", error);
    return NextResponse.json({ error: "Failed to get call" }, { status: 500 });
  }
}

// PATCH - Update call (answer, add ICE candidates, change status)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId } = params;
    const body = await request.json();
    const { action, offer, answer, iceCandidate, status } = body;

    const call = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Check if user is part of this call
    if (call.initiatorId !== session.user.id && call.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const isInitiator = call.initiatorId === session.user.id;
    const metadata = (call.metadata as any) || {
      offer: null,
      answer: null,
      iceCandidates: { initiator: [], receiver: [] },
    };

    let updateData: any = {};

    switch (action) {
      case "offer":
        // Initiator sends offer
        if (!isInitiator) {
          return NextResponse.json(
            { error: "Only initiator can send offer" },
            { status: 403 }
          );
        }
        metadata.offer = offer;
        updateData.metadata = metadata;
        break;

      case "answer":
        // Receiver sends answer
        if (isInitiator) {
          return NextResponse.json(
            { error: "Only receiver can send answer" },
            { status: 403 }
          );
        }
        metadata.answer = answer;
        updateData.metadata = metadata;
        updateData.status = "active";
        break;

      case "ice-candidate":
        // Either party can send ICE candidates
        if (isInitiator) {
          metadata.iceCandidates.initiator.push(iceCandidate);
        } else {
          metadata.iceCandidates.receiver.push(iceCandidate);
        }
        updateData.metadata = metadata;
        break;

      case "accept":
        // Receiver accepts the call
        if (isInitiator) {
          return NextResponse.json(
            { error: "Only receiver can accept" },
            { status: 403 }
          );
        }
        updateData.status = "accepted";
        break;

      case "reject":
        // Receiver rejects the call
        if (isInitiator) {
          return NextResponse.json(
            { error: "Only receiver can reject" },
            { status: 403 }
          );
        }
        updateData.status = "rejected";
        updateData.endedAt = new Date();
        break;

      case "end":
        // Either party can end the call
        updateData.status = "ended";
        updateData.endedAt = new Date();
        if (call.status === "active") {
          const duration = Math.floor(
            (Date.now() - new Date(call.startedAt).getTime()) / 1000
          );
          updateData.duration = duration;
        }
        break;

      case "status":
        // Update status directly
        if (status) {
          updateData.status = status;
          if (status === "ended" || status === "missed" || status === "rejected") {
            updateData.endedAt = new Date();
          }
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: updateData,
      include: {
        initiator: {
          select: { id: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ call: updatedCall });
  } catch (error) {
    console.error("Error updating call:", error);
    return NextResponse.json(
      { error: "Failed to update call" },
      { status: 500 }
    );
  }
}

// DELETE - End/cancel call
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId } = params;

    const call = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Check if user is part of this call
    if (call.initiatorId !== session.user.id && call.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const endedAt = new Date();
    let duration = null;
    let status = "cancelled";

    if (call.status === "active") {
      duration = Math.floor(
        (endedAt.getTime() - new Date(call.startedAt).getTime()) / 1000
      );
      status = "ended";
    } else if (call.status === "pending") {
      // If receiver ends a pending call, it's rejected
      // If initiator ends a pending call, it's cancelled
      status = call.receiverId === session.user.id ? "rejected" : "cancelled";
    }

    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: {
        status,
        endedAt,
        duration,
      },
    });

    // Send call message to conversation (like WhatsApp)
    try {
      // Find or get conversation between the two users
      const conversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { users: { some: { userId: call.initiatorId } } },
            { users: { some: { userId: call.receiverId } } },
          ],
        },
      });

      if (conversation) {
        // Create a call message
        const callMessage = getCallMessage(call.type, status, duration);
        
        await prisma.message.create({
          data: {
            content: callMessage,
            type: "call",
            senderId: session.user.id,
            conversationId: conversation.id,
            metadata: {
              callId: call.id,
              callType: call.type,
              callStatus: status,
              duration: duration,
              initiatorId: call.initiatorId,
              receiverId: call.receiverId,
            },
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });
      }
    } catch (msgError) {
      console.error("Error creating call message:", msgError);
      // Don't fail the call end if message creation fails
    }

    return NextResponse.json({ call: updatedCall });
  } catch (error) {
    console.error("Error ending call:", error);
    return NextResponse.json({ error: "Failed to end call" }, { status: 500 });
  }
}

// Helper function to generate call message text
function getCallMessage(callType: string, status: string, duration: number | null): string {
  const typeLabel = callType === "video" ? "Video call" : "Voice call";
  
  if (status === "ended" && duration) {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    return `${typeLabel} • ${durationStr}`;
  } else if (status === "missed") {
    return `Missed ${typeLabel.toLowerCase()}`;
  } else if (status === "rejected") {
    return `${typeLabel} declined`;
  } else if (status === "cancelled") {
    return `${typeLabel} cancelled`;
  }
  return typeLabel;
}
