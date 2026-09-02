export const normalizeImageUrl = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    const isGoogleDrive = url.hostname === 'drive.google.com' || url.hostname.endsWith('.drive.google.com');

    if (isGoogleDrive) {
      const fileId = raw.match(/\/file\/d\/([^/]+)/i)?.[1] || url.searchParams.get('id');
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`;
      }
    }

    return ['http:', 'https:'].includes(url.protocol) ? raw : '';
  } catch {
    return '';
  }
};
