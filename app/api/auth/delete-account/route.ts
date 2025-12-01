import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// DELETE /api/auth/delete-account - Delete user account permanently
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { password, confirmation } = body;

    // Require password confirmation
    if (!password) {
      return NextResponse.json(
        { error: "Password is required to delete account" },
        { status: 400 }
      );
    }

    // Require typing "DELETE" confirmation
    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Please type DELETE to confirm account deletion" },
        { status: 400 }
      );
    }

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "Cannot delete OAuth account this way" },
        { status: 400 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 403 }
      );
    }

    // Delete all user data in order (due to foreign key constraints)
    const userId = session.user.id;

    // Delete message reactions
    await prisma.messageReaction.deleteMany({
      where: { userId },
    });

    // Delete group message reactions
    await prisma.groupMessageReaction.deleteMany({
      where: { userId },
    });

    // Delete group message read receipts
    await prisma.groupMessageReadReceipt.deleteMany({
      where: { userId },
    });

    // Delete read receipts
    await prisma.readReceipt.deleteMany({
      where: { userId },
    });

    // Delete typing indicators
    await prisma.typingIndicator.deleteMany({
      where: { userId },
    });

    // Delete group typing indicators
    await prisma.groupTypingIndicator.deleteMany({
      where: { userId },
    });

    // Delete messages sent by user
    await prisma.message.deleteMany({
      where: { senderId: userId },
    });

    // Delete group messages sent by user
    await prisma.groupMessage.deleteMany({
      where: { senderId: userId },
    });

    // Delete conversation users
    await prisma.conversationUser.deleteMany({
      where: { userId },
    });

    // Delete group memberships
    await prisma.groupMember.deleteMany({
      where: { userId },
    });

    // Delete groups created by user
    await prisma.group.deleteMany({
      where: { creatorId: userId },
    });

    // Delete calls
    await prisma.call.deleteMany({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
      },
    });

    // Delete chat requests
    await prisma.chatRequest.deleteMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    // Delete email OTPs
    await prisma.emailOtp.deleteMany({
      where: { email: user.email || "" },
    });

    // Delete sessions
    await prisma.session.deleteMany({
      where: { userId },
    });

    // Delete accounts (OAuth links)
    await prisma.account.deleteMany({
      where: { userId },
    });

    // Finally, delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
