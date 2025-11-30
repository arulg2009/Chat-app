// Script to delete all users from the database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllUsers() {
  try {
    console.log('Deleting all data...\n');

    // Delete in order of dependencies
    console.log('Deleting read receipts...');
    const readReceipts = await prisma.readReceipt.deleteMany({});
    console.log(`  Deleted ${readReceipts.count} read receipts`);

    console.log('Deleting messages...');
    const messages = await prisma.message.deleteMany({});
    console.log(`  Deleted ${messages.count} messages`);

    console.log('Deleting group messages...');
    const groupMessages = await prisma.groupMessage.deleteMany({});
    console.log(`  Deleted ${groupMessages.count} group messages`);

    console.log('Deleting conversation users...');
    const convUsers = await prisma.conversationUser.deleteMany({});
    console.log(`  Deleted ${convUsers.count} conversation users`);

    console.log('Deleting conversations...');
    const conversations = await prisma.conversation.deleteMany({});
    console.log(`  Deleted ${conversations.count} conversations`);

    console.log('Deleting group members...');
    const groupMembers = await prisma.groupMember.deleteMany({});
    console.log(`  Deleted ${groupMembers.count} group members`);

    console.log('Deleting groups...');
    const groups = await prisma.group.deleteMany({});
    console.log(`  Deleted ${groups.count} groups`);

    console.log('Deleting chat requests...');
    const chatRequests = await prisma.chatRequest.deleteMany({});
    console.log(`  Deleted ${chatRequests.count} chat requests`);

    console.log('Deleting sessions...');
    const sessions = await prisma.session.deleteMany({});
    console.log(`  Deleted ${sessions.count} sessions`);

    console.log('Deleting accounts...');
    const accounts = await prisma.account.deleteMany({});
    console.log(`  Deleted ${accounts.count} accounts`);

    console.log('Deleting users...');
    const users = await prisma.user.deleteMany({});
    console.log(`  Deleted ${users.count} users`);

    console.log('\n✅ All data deleted successfully!');
  } catch (error) {
    console.error('Error deleting data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllUsers();
