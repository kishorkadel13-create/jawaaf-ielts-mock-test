const ASSET_BUCKET = 'ielts-assets';

export const resolveStorageUrl = (value?: string | null, localFolder = 'uploads') => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';
  if (/^https?:\/\//i.test(rawValue)) return rawValue;

  const normalizedPath = rawValue.replace(/^\/+/, '');
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const localFileName = normalizedPath.split('/').filter(Boolean).pop();

  if (isLocalHost && localFileName && !normalizedPath.includes('/')) {
    return `/${localFolder}/${encodeURIComponent(localFileName)}`;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const configuredBaseUrl = import.meta.env.VITE_ASSET_BASE_URL;
  const storageBaseUrl = configuredBaseUrl
    || (supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${ASSET_BUCKET}` : '');

  return storageBaseUrl
    ? `${storageBaseUrl.replace(/\/+$/, '')}/${normalizedPath}`
    : `/${normalizedPath}`;
};
