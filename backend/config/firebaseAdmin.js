const admin = require("firebase-admin");
require("dotenv").config(); // Đảm bảo Node.js đã đọc file .env

// Tạo object cấu hình từ các biến trong file .env
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Cực kỳ quan trọng: Phải dùng .replace để fix lỗi ký tự xuống dòng của hệ thống
  privateKey: process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined,
};

// Kiểm tra để tránh lỗi khởi tạo nhiều lần (initializeApp multiple times)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("🔥 Firebase Admin đã khởi tạo thành công bằng biến môi trường!");
  } catch (error) {
    console.error("❌ Lỗi khởi tạo Firebase Admin:", error.message);
  }
}

module.exports = admin;