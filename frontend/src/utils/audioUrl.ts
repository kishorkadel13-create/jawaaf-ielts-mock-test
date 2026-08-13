const AUDIO_BUCKET = 'ielts-assets';

export const resolveListeningAudioUrl = (audioFile?: string | null) => {
  const value = String(audioFile || '').trim();
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) return value;

  const normalizedPath = value.replace(/^\/+/, '');
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const isBareLegacyFilename = !normalizedPath.includes('/');

  if (isLocalHost && isBareLegacyFilename) {
    return `/audio/${encodeURIComponent(normalizedPath)}`;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const configuredBaseUrl = import.meta.env.VITE_AUDIO_BASE_URL;
  const storageBaseUrl = configuredBaseUrl
    || (supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${AUDIO_BUCKET}` : '');

  if (storageBaseUrl) {
    const storagePath = normalizedPath.startsWith('audio/')
      ? normalizedPath
      : `audio/${normalizedPath}`;
    return `${storageBaseUrl.replace(/\/+$/, '')}/${storagePath}`;
  }

  return normalizedPath.startsWith('audio/')
    ? `/${normalizedPath}`
    : `/audio/${normalizedPath}`;
};
