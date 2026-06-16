/**
 * Converts Google Drive share URLs to direct image URLs.
 * Handles CORS by routing through our own API proxy.
 */
export function getDriveDirectUrl(url: string): string {
  if (!url) return '';

  // Extract file ID from various Google Drive URL formats
  let fileId = '';

  // Format: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) fileId = openMatch[1];

  // Format: https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) fileId = fileMatch[1];

  // Format: https://drive.google.com/uc?export=view&id=FILE_ID
  const ucMatch = url.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) fileId = ucMatch[1];

  if (!fileId) return url;

  // Return our proxy URL to avoid CORS
  return `/api/proxy-image?fileId=${fileId}`;
}

export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  return null;
}
