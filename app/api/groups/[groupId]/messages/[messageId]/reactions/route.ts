import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Store reactions in memory temporarily until the new schema is deployed
// In production, this will use the GroupMessageReaction model
const reactionStore = new Map<string, Map<string, Set<string>>>();

function getReactionKey(messageId: string): string {
  return messageId;
}

// POST - Add reaction to a group message
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, messageId } = params;
    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
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

    // Try to use the database model if available, otherwise use in-memory store
    try {
      // @ts-ignore - Model may not exist in older schema
      if (prisma.groupMessageReaction) {
        const existingReaction = await (prisma as any).groupMessageReaction.findUnique({
          where: {
            userId_messageId_emoji: {
              userId: session.user.id,
              messageId,
              emoji,
            },
          },
        });

        if (existingReaction) {
          await (prisma as any).groupMessageReaction.delete({
            where: { id: existingReaction.id },
          });
          return NextResponse.json({ removed: true, emoji });
        }

        const reaction = await (prisma as any).groupMessageReaction.create({
          data: {
            emoji,
            userId: session.user.id,
            messageId,
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

        return NextResponse.json(reaction);
      }
    } catch {
      // Fall through to in-memory implementation
    }

    // In-memory fallback
    const key = getReactionKey(messageId);
    if (!reactionStore.has(key)) {
      reactionStore.set(key, new Map());
    }
    const messageReactions = reactionStore.get(key)!;
    
    if (!messageReactions.has(emoji)) {
      messageReactions.set(emoji, new Set());
    }
    const emojiUsers = messageReactions.get(emoji)!;
    
    if (emojiUsers.has(session.user.id)) {
      emojiUsers.delete(session.user.id);
      if (emojiUsers.size === 0) {
        messageReactions.delete(emoji);
      }
      return NextResponse.json({ removed: true, emoji });
    } else {
      emojiUsers.add(session.user.id);
      return NextResponse.json({ added: true, emoji });
    }
  } catch (error) {
    console.error("Error adding reaction:", error);
    return NextResponse.json({ error: "Failed to add reaction" }, { status: 500 });
  }
}

// GET - Get reactions for a message
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = params;

    // Try database first
    try {
      // @ts-ignore
      if (prisma.groupMessageReaction) {
        const reactions = await (prisma as any).groupMessageReaction.findMany({
          where: { messageId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        const groupedReactions = reactions.reduce((acc: Record<string, any>, reaction: any) => {
          if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = {
              emoji: reaction.emoji,
              count: 0,
              users: [],
              hasReacted: false,
            };
          }
          acc[reaction.emoji].count++;
          acc[reaction.emoji].users.push(reaction.user);
          if (reaction.userId === session.user.id) {
            acc[reaction.emoji].hasReacted = true;
          }
          return acc;
        }, {});

        return NextResponse.json(Object.values(groupedReactions));
      }
    } catch {
      // Fall through to in-memory
    }

    // In-memory fallback
    const key = getReactionKey(messageId);
    const messageReactions = reactionStore.get(key);
    
    if (!messageReactions) {
      return NextResponse.json([]);
    }

    const result: any[] = [];
    messageReactions.forEach((users, emoji) => {
      result.push({
        emoji,
        count: users.size,
        users: Array.from(users).map(id => ({ id, name: null })),
        hasReacted: users.has(session.user.id),
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return NextResponse.json({ error: "Failed to fetch reactions" }, { status: 500 });
  }
}
