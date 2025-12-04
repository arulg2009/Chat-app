import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST - Initiate a new call
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, type, offer } = await request.json();

    if (!receiverId || !type) {
      return NextResponse.json(
        { error: "Receiver ID and call type are required" },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, name: true, status: true },
    });

    if (!receiver) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cancel any existing pending calls from this user to this receiver
    await prisma.call.updateMany({
      where: {
        initiatorId: session.user.id,
        receiverId: receiverId,
        status: "pending",
      },
      data: {
        status: "cancelled",
        endedAt: new Date(),
      },
    });

    // Create new call
    const call = await prisma.call.create({
      data: {
        initiatorId: session.user.id,
        receiverId: receiverId,
        type: type,
        status: "pending",
        metadata: {
          offer: offer || null,
          answer: null,
          iceCandidates: {
            initiator: [],
            receiver: [],
          },
        },
      },
      include: {
        initiator: {
          select: { id: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ call });
  } catch (error) {
    console.error("Error initiating call:", error);
    return NextResponse.json(
      { error: "Failed to initiate call" },
      { status: 500 }
    );
  }
}

// GET - Check for incoming calls or get call status
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const callId = searchParams.get("callId");

    if (callId) {
      // Get specific call status
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
    }

    // Check for any incoming pending calls (within last 60 seconds)
    const sixtySecondsAgo = new Date(Date.now() - 60000);
    
    const incomingCall = await prisma.call.findFirst({
      where: {
        receiverId: session.user.id,
        status: "pending",
        startedAt: { gte: sixtySecondsAgo },
      },
      include: {
        initiator: {
          select: { id: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    // Also check for active calls user is part of
    const activeCall = await prisma.call.findFirst({
      where: {
        OR: [
          { initiatorId: session.user.id },
          { receiverId: session.user.id },
        ],
        status: "active",
      },
      include: {
        initiator: {
          select: { id: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({
      incomingCall,
      activeCall,
    });
  } catch (error) {
    console.error("Error checking calls:", error);
    return NextResponse.json(
      { error: "Failed to check calls" },
      { status: 500 }
    );
  }
}
