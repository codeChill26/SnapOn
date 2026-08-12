/**
 * Formats and normalizes image URLs for browser rendering.
 * Resolves Cloudinary issues with unrenderable Apple .heic files by converting extensions to .jpg on the fly,
 * and adds /f_auto/ format auto-detection optimization.
 */
export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  let formatted = url.trim();

  // If URL uses dead via.placeholder.com service, return empty string to trigger fallback
  if (formatted.includes('via.placeholder.com')) {
    return '';
  }

  // Normalize any /uploads/ URL regardless of original host (127.0.0.1, 192.168.x.x, localhost, old render domains)
  const uploadIndex = formatted.indexOf('/uploads/');
  if (uploadIndex !== -1) {
    const uploadPath = formatted.slice(uploadIndex);
    formatted = `https://graceful-playfulness-production.up.railway.app${uploadPath}`;
  } else if (formatted.startsWith('uploads/')) {
    formatted = `https://graceful-playfulness-production.up.railway.app/${formatted}`;
  }

  // Replace outdated render domains with Railway URL
  if (formatted.includes('onrender.com')) {
    formatted = formatted.replace(/snapon(-debug)?\.onrender\.com/g, 'graceful-playfulness-production.up.railway.app');
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
