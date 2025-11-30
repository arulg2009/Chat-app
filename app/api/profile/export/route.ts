import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/profile/export - Export all user data
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all user data
    const [user, sentMessages, chatRequests, groupMemberships, groupMessages] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            realName: true,
            email: true,
            bio: true,
            hobbies: true,
            location: true,
            website: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            occupation: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.message.findMany({
          where: { senderId: userId },
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            conversationId: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.chatRequest.findMany({
          where: {
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
          select: {
            id: true,
            status: true,
            message: true,
            createdAt: true,
            sender: { select: { name: true, email: true } },
            receiver: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.groupMember.findMany({
          where: { userId },
          select: {
            role: true,
            joinedAt: true,
            group: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        }),
        prisma.groupMessage.findMany({
          where: { senderId: userId },
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            group: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: user,
      messages: sentMessages,
      chatRequests,
      groups: groupMemberships,
      groupMessages,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="chat-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
