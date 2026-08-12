/**
 * Formats and normalizes image URLs for browser rendering.
 * Resolves Cloudinary issues with unrenderable Apple .heic files by converting extensions to .jpg on the fly,
 * and adds /f_auto/ format auto-detection optimization.
 */
const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://graceful-playfulness-production.up.railway.app'
).replace(/\/+$/, '');

const LEGACY_BACKEND_HOSTS = ['snapon-debug.onrender.com', 'snapon.onrender.com'];

export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  let formatted = url.trim();

<<<<<<< HEAD
  // Backend moved to Railway — rewrite legacy Render hosts so old image URLs still resolve
  const BACKEND_HOST = 'https://graceful-playfulness-production.up.railway.app';
  formatted = formatted
    .replace('https://snapon.onrender.com', BACKEND_HOST)
    .replace('https://snapon-debug.onrender.com', BACKEND_HOST);

  // Handle relative upload paths
  if (formatted.startsWith('/uploads/') || formatted.startsWith('uploads/')) {
    const cleanPath = formatted.startsWith('/') ? formatted : '/' + formatted;
    formatted = `${BACKEND_HOST}${cleanPath}`;
=======
  // If URL uses dead via.placeholder.com service, return empty string to trigger fallback
  if (formatted.includes('via.placeholder.com')) {
    return '';
  }

  // Normalize any /uploads/ URL regardless of original host (127.0.0.1, 192.168.x.x, localhost, old render domains)
  const uploadIndex = formatted.indexOf('/uploads/');
  if (uploadIndex !== -1) {
    const uploadPath = formatted.slice(uploadIndex);
    formatted = `${BACKEND_ORIGIN}${uploadPath}`;
  } else if (formatted.startsWith('uploads/')) {
    formatted = `${BACKEND_ORIGIN}/${formatted}`;
  }

  // Replace outdated Render hosts with the current backend origin
  for (const legacyHost of LEGACY_BACKEND_HOSTS) {
    if (formatted.includes(legacyHost)) {
      formatted = formatted.replace(`https://${legacyHost}`, BACKEND_ORIGIN);
      formatted = formatted.replace(`http://${legacyHost}`, BACKEND_ORIGIN);
    }
>>>>>>> main
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
