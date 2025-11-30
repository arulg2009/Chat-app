import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// In-memory store for read receipts until schema is deployed
const readReceiptStore = new Map<string, Map<string, Date>>();

// POST - Mark messages as read
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
    const { messageIds } = await request.json();

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: "Message IDs are required" }, { status: 400 });
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

    // Try database first
    try {
      // @ts-ignore
      if (prisma.groupMessageReadReceipt) {
        const readReceipts = await Promise.all(
          messageIds.map(async (messageId: string) => {
            try {
              return await (prisma as any).groupMessageReadReceipt.upsert({
                where: {
                  messageId_userId: {
                    messageId,
                    userId: session.user.id,
                  },
                },
                update: {},
                create: {
                  messageId,
                  userId: session.user.id,
                },
              });
            } catch {
              return null;
            }
          })
        );

        return NextResponse.json({
          success: true,
          count: readReceipts.filter(Boolean).length,
        });
      }
    } catch {
      // Fall through to in-memory
    }

    // In-memory fallback
    const now = new Date();
    messageIds.forEach((messageId: string) => {
      if (!readReceiptStore.has(messageId)) {
        readReceiptStore.set(messageId, new Map());
      }
      readReceiptStore.get(messageId)!.set(session.user.id, now);
    });

    return NextResponse.json({
      success: true,
      count: messageIds.length,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 });
  }
}

// GET - Get read receipts for messages
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
    const messageIds = url.searchParams.get("messageIds")?.split(",") || [];

    if (messageIds.length === 0) {
      return NextResponse.json({ error: "Message IDs are required" }, { status: 400 });
    }

    // Try database first
    try {
      // @ts-ignore
      if (prisma.groupMessageReadReceipt) {
        const readReceipts = await (prisma as any).groupMessageReadReceipt.findMany({
          where: {
            messageId: { in: messageIds },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });

        const grouped = messageIds.reduce((acc: Record<string, any[]>, msgId: string) => {
          acc[msgId] = readReceipts
            .filter((r: any) => r.messageId === msgId)
            .map((r: any) => ({
              userId: r.userId,
              readAt: r.readAt,
              user: r.user,
            }));
          return acc;
        }, {});

        return NextResponse.json(grouped);
      }
    } catch {
      // Fall through to in-memory
    }

    // In-memory fallback
    const grouped: Record<string, any[]> = {};
    messageIds.forEach((msgId: string) => {
      const receipts = readReceiptStore.get(msgId);
      grouped[msgId] = receipts
        ? Array.from(receipts.entries()).map(([userId, readAt]) => ({
            userId,
            readAt,
          }))
        : [];
    });

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("Error fetching read receipts:", error);
    return NextResponse.json({ error: "Failed to fetch read receipts" }, { status: 500 });
  }
}
