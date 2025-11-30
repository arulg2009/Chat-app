import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/conversations/[conversationId]/media - Get shared media in a conversation
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type") || "image"; // image, file, all

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
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const whereClause: any = {
      conversationId,
      isDeleted: false,
    };

    if (type === "image") {
      whereClause.type = "image";
    } else if (type === "file") {
      whereClause.type = { in: ["file", "document"] };
    } else if (type !== "all") {
      whereClause.type = type;
    }

    const media = await prisma.message.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        type: true,
        createdAt: true,
        metadata: true,
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error("Error fetching media:", error);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}
