// Script to set admin role for a specific user
// Run with: node scripts/set-admin.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setAdmin() {
  const adminEmail = 'kaarthii009,g@gmail.com'; // The email you specified
  
  try {
    // Find user by email (try different variations)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'kaarthii009,g@gmail.com' },
          { email: 'kaarthii009g@gmail.com' },
          { email: { contains: 'kaarthii009' } },
        ],
      },
    });
    
    if (!user) {
      console.log('User not found. Listing all users:');
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true },
      });
      console.log(allUsers);
      return;
    }
    
    // Update user to admin
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'admin' },
    });
    
    console.log(`✅ User "${updated.name}" (${updated.email}) is now an ADMIN`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdmin();
