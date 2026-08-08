/**
 * Formats and normalizes image URLs for browser rendering.
 * Resolves Cloudinary issues with unrenderable Apple .heic files by converting extensions to .jpg on the fly,
 * and adds /f_auto/ format auto-detection optimization.
 */
export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  let formatted = url;

  // Replace outdated snapon.onrender.com with snapon-debug.onrender.com
  if (formatted.includes('snapon.onrender.com')) {
    formatted = formatted.replace('snapon.onrender.com', 'snapon-debug.onrender.com');
  }

  // Handle relative upload paths
  if (formatted.startsWith('/uploads/') || formatted.startsWith('uploads/')) {
    const cleanPath = formatted.startsWith('/') ? formatted : '/' + formatted;
    formatted = `https://snapon-debug.onrender.com${cleanPath}`;
  }

  // Handle Cloudinary hosted files
  if (formatted.includes('cloudinary.com')) {
    // Replace Apple HEIC image extension (case insensitive) with JPG so Cloudinary converts it on-the-fly
    if (/\.heic$/i.test(formatted)) {
      formatted = formatted.replace(/\.heic$/i, '.jpg');
    }

    // Insert f_auto for Cloudinary format auto-detection (WebP, PNG, JPG etc. depending on browser support)
    if (formatted.includes('/image/upload/') && !formatted.includes('/f_auto')) {
      formatted = formatted.replace('/image/upload/', '/image/upload/f_auto/');
    }
  }

  return formatted;
}
