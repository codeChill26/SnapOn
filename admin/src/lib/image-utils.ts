/**
 * Formats and normalizes image URLs for browser rendering.
 * Resolves Cloudinary issues with unrenderable Apple .heic files by converting extensions to .jpg on the fly,
 * and adds /f_auto/ format auto-detection optimization.
 */
export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  let formatted = url;

  // Backend moved to Railway — rewrite legacy Render hosts so old image URLs still resolve
  const BACKEND_HOST = 'https://graceful-playfulness-production.up.railway.app';
  formatted = formatted
    .replace('https://snapon.onrender.com', BACKEND_HOST)
    .replace('https://snapon-debug.onrender.com', BACKEND_HOST);

  // Handle relative upload paths
  if (formatted.startsWith('/uploads/') || formatted.startsWith('uploads/')) {
    const cleanPath = formatted.startsWith('/') ? formatted : '/' + formatted;
    formatted = `${BACKEND_HOST}${cleanPath}`;
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
