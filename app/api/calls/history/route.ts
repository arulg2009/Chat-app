import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get call history
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all, sent, received, missed
    const limit = parseInt(searchParams.get("limit") || "50");

    let whereClause: any = {
      OR: [
        { initiatorId: session.user.id },
        { receiverId: session.user.id },
      ],
      status: { not: "pending" }, // Don't show pending calls in history
    };

    if (filter === "sent") {
      whereClause = {
        initiatorId: session.user.id,
        status: { not: "pending" },
      };
    } else if (filter === "received") {
      whereClause = {
        receiverId: session.user.id,
        status: { not: "pending" },
      };
    } else if (filter === "missed") {
      whereClause = {
        receiverId: session.user.id,
        status: "missed",
      };
    }

    const calls = await prisma.call.findMany({
      where: whereClause,
      include: {
        initiator: {
          select: { id: true, name: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    // Format calls for the frontend
    const formattedCalls = calls.map((call) => {
      const isOutgoing = call.initiatorId === session.user.id;
      const otherUser = isOutgoing ? call.receiver : call.initiator;

      return {
        id: call.id,
        type: call.type,
        status: call.status,
        isOutgoing,
        duration: call.duration,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          image: otherUser.image,
        },
      };
    });

    return NextResponse.json({ calls: formattedCalls });
  } catch (error) {
    console.error("Error fetching call history:", error);
    return NextResponse.json(
      { error: "Failed to fetch call history" },
      { status: 500 }
    );
  }
}
