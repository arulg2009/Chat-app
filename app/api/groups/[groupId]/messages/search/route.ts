import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Search messages in a group
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = params;
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const dateFilter = url.searchParams.get("dateFilter");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Build date filter
    let dateCondition: any = {};
    if (dateFilter) {
      const now = new Date();
      switch (dateFilter) {
        case "today":
          dateCondition = {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          };
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateCondition = { gte: weekAgo };
          break;
        case "month":
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          dateCondition = { gte: monthAgo };
          break;
      }
    }

    const messages = await prisma.groupMessage.findMany({
      where: {
        groupId,
        isDeleted: false,
        content: {
          contains: query,
          mode: "insensitive",
        },
        ...(Object.keys(dateCondition).length > 0 && { createdAt: dateCondition }),
      },
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      results: messages,
      count: messages.length,
    });
  } catch (error) {
    console.error("Error searching messages:", error);
    return NextResponse.json({ error: "Failed to search messages" }, { status: 500 });
  }
}
