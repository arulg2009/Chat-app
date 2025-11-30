import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// In-memory store for typing indicators
const typingStore = new Map<string, Map<string, { name: string | null; timestamp: number }>>();

// POST - Update typing status
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = params;
    const { isTyping } = await request.json();

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

    // Try database first
    try {
      // @ts-ignore
      if (prisma.groupTypingIndicator) {
        const indicator = await (prisma as any).groupTypingIndicator.upsert({
          where: {
            userId_groupId: {
              userId: session.user.id,
              groupId,
            },
          },
          update: {
            isTyping: !!isTyping,
          },
          create: {
            userId: session.user.id,
            groupId,
            isTyping: !!isTyping,
          },
        });

        return NextResponse.json(indicator);
      }
    } catch {
      // Fall through to in-memory
    }

    // In-memory fallback
    if (!typingStore.has(groupId)) {
      typingStore.set(groupId, new Map());
    }
    const groupTyping = typingStore.get(groupId)!;

    if (isTyping) {
      groupTyping.set(session.user.id, {
        name: session.user.name || null,
        timestamp: Date.now(),
      });
    } else {
      groupTyping.delete(session.user.id);
    }

    return NextResponse.json({ success: true, isTyping });
  } catch (error) {
    console.error("Error updating typing status:", error);
    return NextResponse.json({ error: "Failed to update typing status" }, { status: 500 });
  }
}

// GET - Get users currently typing
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

    // Try database first
    try {
      // @ts-ignore
      if (prisma.groupTypingIndicator) {
        const fiveSecondsAgo = new Date(Date.now() - 5000);

        const typingUsers = await (prisma as any).groupTypingIndicator.findMany({
          where: {
            groupId,
            isTyping: true,
            updatedAt: {
              gte: fiveSecondsAgo,
            },
            userId: {
              not: session.user.id,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return NextResponse.json(
          typingUsers.map((t: any) => ({
            userId: t.userId,
            name: t.user.name,
          }))
        );
      }
    } catch {
      // Fall through to in-memory
    }

    // In-memory fallback
    const groupTyping = typingStore.get(groupId);
    if (!groupTyping) {
      return NextResponse.json([]);
    }

    const fiveSecondsAgo = Date.now() - 5000;
    const typingUsers: Array<{ userId: string; name: string | null }> = [];

    groupTyping.forEach((data, odId) => {
      if (data.timestamp > fiveSecondsAgo && odId !== session.user.id) {
        typingUsers.push({ userId: odId, name: data.name });
      }
    });

    // Clean up old entries
    groupTyping.forEach((data, odId) => {
      if (data.timestamp <= fiveSecondsAgo) {
        groupTyping.delete(odId);
      }
    });

    return NextResponse.json(typingUsers);
  } catch (error) {
    console.error("Error fetching typing status:", error);
    return NextResponse.json({ error: "Failed to fetch typing status" }, { status: 500 });
  }
}
