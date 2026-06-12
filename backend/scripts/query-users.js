require('dotenv').config();
const prisma = require('../db/prisma');

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        firebaseUid: true,
      },
      take: 10,
    });
    console.log('👥 Current Users in DB:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error querying users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
