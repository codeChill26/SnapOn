'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadImage } = require('../utils/cloudinary');

// List of filenames to look for in backend/public/uploads
const BANNER_FILES = [
  { key: 'BANNER_CONTENT_IMAGE_URL', filename: 'content.webp' },
  { key: 'BANNER_DESIGN_IMAGE_URL', filename: 'design.webp' },
  { key: 'BANNER_TECH_IMAGE_URL', filename: 'tech.webp' },
  { key: 'BANNER_RESEARCH_IMAGE_URL', filename: 'research.webp' },
  { key: 'BANNER_STUDY_SUPPORT_IMAGE_URL', filename: 'study_support.webp' },
];

(async () => {
  console.log('🚀 Starting automatic upload to Cloudinary...');
  
  const uploadDir = path.join(__dirname, '../public/uploads');
  const envResults = [];

  for (const item of BANNER_FILES) {
    const filePath = path.join(uploadDir, item.filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      console.log(`👉 Please place your image file named "${item.filename}" inside "backend/public/uploads/" folder.`);
      continue;
    }

    try {
      console.log(`📤 Uploading "${item.filename}" to Cloudinary...`);
      
      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      const mimeType = item.filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      const formattedBase64 = `data:${mimeType};base64,${base64Data}`;

      // Upload using existing utility
      const secureUrl = await uploadImage(formattedBase64);
      
      console.log(`✅ Uploaded successfully! URL: ${secureUrl}`);
      envResults.push(`${item.key}=${secureUrl}`);
    } catch (err) {
      console.error(`❌ Failed to upload "${item.filename}":`, err.message);
    }
  }

  if (envResults.length > 0) {
    console.log('\n==================================================');
    console.log('🎉 UPLOAD COMPLETED SUCCESSFULLY!');
    console.log('Please copy the lines below and paste them into your backend .env file:\n');
    console.log(envResults.join('\n'));
    console.log('==================================================\n');
    console.log('👉 After updating your .env, run "node scripts/seed-banners.js" to apply them to your database.');
  }
})();
