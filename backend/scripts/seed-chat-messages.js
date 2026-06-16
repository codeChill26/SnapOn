require('dotenv').config();
const prisma = require('../db/prisma');

async function main() {
  const userTuankiet = 'd1793f22-29d3-49da-ae03-fac582bac36d'; // Tuankietpro04 (hirer)
  const userVinh = '15666133-dfdc-48a5-a915-bbb52c207a18';     // Quang Vinh (tasker)
  const userKim = '23c782fb-4b33-498e-94a1-271b99f12751';      // Phúc Kim (hirer)

  console.log('🌱 Starting seeding chat test data...');

  // Helper to safely create/find a conversation sorting IDs lexicographically
  const getOrCreateConversation = async (uidA, uidB) => {
    const user1Id = uidA < uidB ? uidA : uidB;
    const user2Id = uidA < uidB ? uidB : uidA;

    let conv = await prisma.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } }
    });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: { user1Id, user2Id }
      });
      console.log(`💬 Created new conversation between user ${user1Id} and ${user2Id}`);
    } else {
      console.log(`💬 Found existing conversation between user ${user1Id} and ${user2Id}`);
    }
    return conv;
  };

  try {
    // -------------------------------------------------------------
    // Conversation 1: Tuankietpro04 & Quang Vinh
    // -------------------------------------------------------------
    const conv1 = await getOrCreateConversation(userTuankiet, userVinh);
    
    // Clear old messages in this conversation to prevent duplicate accumulation
    await prisma.message.deleteMany({ where: { conversationId: conv1.id } });

    // Seed messages
    await prisma.message.createMany({
      data: [
        {
          conversationId: conv1.id,
          senderId: userVinh,
          text: 'Chào Tuấn Kiệt, tôi thấy bạn đang tìm người làm dọn dẹp nhà cửa phải không?',
          createdAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
        },
        {
          conversationId: conv1.id,
          senderId: userTuankiet,
          text: 'Chào bạn, đúng rồi ạ. Bạn có thể làm vào cuối tuần này không?',
          createdAt: new Date(Date.now() - 3600000 * 1.8) // 1.8 hours ago
        },
        {
          conversationId: conv1.id,
          senderId: userVinh,
          text: 'Dạ được, tôi rảnh nguyên ngày Thứ Bảy từ 8h sáng.',
          createdAt: new Date(Date.now() - 3600000 * 1.5) // 1.5 hours ago
        },
        {
          conversationId: conv1.id,
          senderId: userTuankiet,
          text: 'Tuyệt vời, vậy để mình chốt lịch và tạo hợp đồng trên app nhé!',
          createdAt: new Date(Date.now() - 3600000 * 1.2) // 1.2 hours ago
        }
      ]
    });
    console.log('✅ Seeded messages for Conversation 1');

    // -------------------------------------------------------------
    // Conversation 2: Tuankietpro04 & Phúc Kim
    // -------------------------------------------------------------
    const conv2 = await getOrCreateConversation(userTuankiet, userKim);
    
    // Clear old messages
    await prisma.message.deleteMany({ where: { conversationId: conv2.id } });

    await prisma.message.createMany({
      data: [
        {
          conversationId: conv2.id,
          senderId: userKim,
          text: 'Xin chào, mình có câu hỏi về công việc đăng tuyển nấu ăn của bạn.',
          createdAt: new Date(Date.now() - 600000 * 10) // 100 mins ago
        },
        {
          conversationId: conv2.id,
          senderId: userTuankiet,
          text: 'Chào bạn, bạn cứ hỏi tự nhiên nhé. Mình rất sẵn lòng giải đáp.',
          createdAt: new Date(Date.now() - 600000 * 8) // 80 mins ago
        },
        {
          conversationId: conv2.id,
          senderId: userKim,
          text: 'Công việc này có yêu cầu phải biết nấu món chay không bạn?',
          createdAt: new Date(Date.now() - 600000 * 5) // 50 mins ago
        },
        {
          conversationId: conv2.id,
          senderId: userTuankiet,
          text: 'Không cần đâu bạn nhé, nấu ăn gia đình bình thường là được.',
          createdAt: new Date(Date.now() - 600000 * 2) // 20 mins ago
        }
      ]
    });
    console.log('✅ Seeded messages for Conversation 2');

    // -------------------------------------------------------------
    // Conversation 3: Quang Vinh & Phúc Kim
    // -------------------------------------------------------------
    const conv3 = await getOrCreateConversation(userVinh, userKim);
    
    // Clear old messages
    await prisma.message.deleteMany({ where: { conversationId: conv3.id } });

    await prisma.message.createMany({
      data: [
        {
          conversationId: conv3.id,
          senderId: userVinh,
          text: 'Chào bạn Phúc Kim, bạn có nhận làm việc sửa điện nước vào tối nay không?',
          createdAt: new Date(Date.now() - 60000 * 30) // 30 mins ago
        },
        {
          conversationId: conv3.id,
          senderId: userKim,
          text: 'Chào bạn, tối nay mình bận mất rồi. Sáng mai tầm 9h thì được nha.',
          createdAt: new Date(Date.now() - 60000 * 25) // 25 mins ago
        }
      ]
    });
    console.log('✅ Seeded messages for Conversation 3');

    // Update conversations' updatedAt dates to trigger correct order in chat list
    await prisma.conversation.update({
      where: { id: conv1.id },
      data: { updatedAt: new Date() }
    });
    await prisma.conversation.update({
      where: { id: conv2.id },
      data: { updatedAt: new Date(Date.now() - 60000 * 20) }
    });
    await prisma.conversation.update({
      where: { id: conv3.id },
      data: { updatedAt: new Date(Date.now() - 60000 * 25) }
    });
    
    console.log('🎉 Database seeding completed successfully.');
  } catch (error) {
    console.error('❌ Error during chat seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
