'use strict';

/**
 * File & Base64 Image Validation Utility
 */

/**
 * Validates a base64 image string for size limit, magic bytes, and mime type.
 * @param {string} base64Str - The base64 encoded image string (with or without data URI prefix).
 * @param {number} [maxSizeMB=5] - Maximum allowed size in Megabytes.
 * @returns {{ buffer: Buffer, mime: string, sanitizedFilename: string }}
 */
function validateBase64Image(base64Str, maxSizeMB = 5) {
  if (!base64Str || typeof base64Str !== 'string') {
    throw new Error('Invalid image data format.');
  }

  // 1. Extract raw base64 data and verify it is valid base64
  const base64Data = base64Str.replace(/^data:image\/[\w.+-]+;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');

  // 2. Validate File Size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (buffer.length > maxSizeBytes) {
    throw new Error(`File size exceeds limit (${maxSizeMB}MB).`);
  }
  if (buffer.length < 4) {
    throw new Error('File data is too small to be a valid image.');
  }

  // 3. Magic Bytes Validation
  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  let mime = '';

  if (hex.startsWith('89504E47')) {
    mime = 'image/png';
  } else if (hex.startsWith('FFD8FF')) {
    mime = 'image/jpeg';
  } else if (hex.startsWith('47494638')) {
    mime = 'image/gif';
  } else if (hex.startsWith('52494646')) {
    const riffType = buffer.toString('ascii', 8, 12);
    if (riffType === 'WEBP') {
      mime = 'image/webp';
    }
  }

  if (!mime) {
    throw new Error('Invalid image signature. Only PNG, JPEG, GIF, and WebP images are allowed.');
  }

  // 4. Mime Verification
  const match = base64Str.match(/^data:([^;]+);base64,/);
  if (match) {
    const declaredMime = match[1].toLowerCase();
    const isJpgJpegMatch = (declaredMime === 'image/jpg' || declaredMime === 'image/jpeg') && mime === 'image/jpeg';
    if (declaredMime !== mime && !isJpgJpegMatch) {
      throw new Error('MIME type validation failed. File content type mismatch.');
    }
  }

  // 5. Filename Sanitization: generate a unique, clean, and safe filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
  const sanitizedFilename = `upload_${timestamp}_${randomStr}.${ext}`;

  return {
    buffer,
    mime,
    sanitizedFilename
  };
}

module.exports = {
  validateBase64Image
};
