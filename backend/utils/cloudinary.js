const crypto = require('crypto');
require('dotenv').config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

/**
 * Uploads a base64 image string to Cloudinary.
 * @param {string} base64Data The base64 encoded image content (can be with or without data:image/xxx;base64, prefix).
 * @returns {Promise<string>} The uploaded image secure URL.
 */
async function uploadImage(base64Data) {
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Cloudinary environment variables are missing! Make sure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env.');
    throw new Error('Cloudinary configuration is missing. Please contact the administrator.');
  }

  // Ensure base64Data has correct Data URI scheme
  let formattedData = base64Data;
  if (!formattedData.startsWith('data:image/')) {
    formattedData = `data:image/jpeg;base64,${formattedData}`;
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'snapon_tasks';

    // Cloudinary signature parameters must be sorted alphabetically: folder, then timestamp
    const signatureStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: formattedData,
        api_key: apiKey,
        timestamp: timestamp,
        folder: folder,
        signature: signature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary API responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}

module.exports = {
  uploadImage,
};
