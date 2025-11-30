import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/groups/[groupId]/media - Get shared media in a group
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type") || "image";

    // Check if user can access this group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isMember = group.members.length > 0;
    if (group.isPrivate && !isMember) {
      return NextResponse.json(
        { error: "You don't have access to this group" },
        { status: 403 }
      );
    }

    const whereClause: any = {
      groupId,
    };

    if (type === "image") {
      whereClause.type = "image";
    } else if (type === "file") {
      whereClause.type = { in: ["file", "document"] };
    } else if (type !== "all") {
      whereClause.type = type;
    }

    const media = await prisma.groupMessage.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        type: true,
        createdAt: true,
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
    console.error("Error fetching group media:", error);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}
