export const getEmbeddableVideoUrl = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i) || raw.match(/[?&]id=([^&]+)/i);
  if (raw.includes('drive.google.com') && driveMatch?.[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  const youtubeMatch =
    raw.match(/youtube\.com\/watch\?v=([^&]+)/i) ||
    raw.match(/youtu\.be\/([^?&]+)/i) ||
    raw.match(/youtube\.com\/embed\/([^?&]+)/i);
  if (youtubeMatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  return raw;
};

export const shouldUseVideoIframe = (value?: string) => {
  const raw = String(value || '').trim();
  return /drive\.google\.com|youtube\.com|youtu\.be|vimeo\.com/i.test(raw);
};

export const getVideoThumbnailUrl = (videoValue?: string, thumbnailValue?: string) => {
  const thumbnail = String(thumbnailValue || '').trim();
  if (thumbnail) return thumbnail;

  const raw = String(videoValue || '').trim();
  if (!raw) return '';

  const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i) || raw.match(/[?&]id=([^&]+)/i);
  if (raw.includes('drive.google.com') && driveMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
  }

  const youtubeMatch =
    raw.match(/youtube\.com\/watch\?v=([^&]+)/i) ||
    raw.match(/youtu\.be\/([^?&]+)/i) ||
    raw.match(/youtube\.com\/embed\/([^?&]+)/i);
  if (youtubeMatch?.[1]) return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;

  return '';
};

export const getEmbeddableResourceUrl = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i) || raw.match(/[?&]id=([^&]+)/i);
  if (raw.includes('drive.google.com') && driveMatch?.[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  const docsMatch = raw.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([^/]+)/i);
  if (docsMatch?.[1] && docsMatch?.[2]) {
    return `https://docs.google.com/${docsMatch[1]}/d/${docsMatch[2]}/preview`;
  }

  if (/\.pdf($|\?)/i.test(raw)) {
    const joiner = raw.includes('#') ? '&' : '#';
    return `${raw}${joiner}toolbar=0&navpanes=0`;
  }

  return raw;
};
