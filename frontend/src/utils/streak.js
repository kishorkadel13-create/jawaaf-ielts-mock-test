export const STREAK_TIME_ZONE = 'Asia/Kathmandu';
export const STREAK_UPDATED_EVENT = 'jawaaf-streak-updated';

const nepalDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: STREAK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const nepalWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: STREAK_TIME_ZONE,
  weekday: 'narrow',
});

const nepalMonthFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: STREAK_TIME_ZONE,
  month: 'long',
  year: 'numeric',
});

const getDateKeyFromParts = (year, month, day) => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const isDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const getStreakStorageKeys = (userId) => ({
  storageKey: `user_streak_data_${userId}`,
  lastSeenKey: `user_streak_last_seen_${userId}`,
});

const readStoredStreakState = (userId) => {
  const { storageKey, lastSeenKey } = getStreakStorageKeys(userId);
  let activeDates = [];
  let lastSeenDate = '';
  let lastOpenedAt = '';

  try {
    const savedData = window.localStorage.getItem(storageKey);
    const parsedData = savedData ? JSON.parse(savedData) : [];
    const parsedDates = Array.isArray(parsedData) ? parsedData : parsedData?.activeDates;
    activeDates = Array.isArray(parsedDates) ? parsedDates.filter(isDateKey) : [];
    lastSeenDate = Array.isArray(parsedData) ? '' : parsedData?.lastSeenDate || '';
    lastOpenedAt = Array.isArray(parsedData) ? '' : parsedData?.lastOpenedAt || parsedData?.updatedAt || '';
  } catch {
    activeDates = [];
  }

  try {
    const legacyLastSeenDate = window.localStorage.getItem(lastSeenKey) || '';
    if (isDateKey(legacyLastSeenDate)) activeDates.push(legacyLastSeenDate);
    if (!lastSeenDate && isDateKey(legacyLastSeenDate)) lastSeenDate = legacyLastSeenDate;
  } catch {}

  if (isDateKey(lastSeenDate)) activeDates.push(lastSeenDate);

  return {
    activeDates: Array.from(new Set(activeDates)).sort(),
    lastOpenedAt,
  };
};

const saveStoredStreakState = (userId, activeDates, todayStr, openedAt) => {
  const { storageKey, lastSeenKey } = getStreakStorageKeys(userId);

  window.localStorage.setItem(storageKey, JSON.stringify({
    activeDates,
    lastSeenDate: todayStr,
    lastOpenedAt: openedAt,
    updatedAt: openedAt,
    timeZone: STREAK_TIME_ZONE,
  }));
  window.localStorage.setItem(lastSeenKey, todayStr);
};

const calculateCurrentStreak = (activeDates, anchorDateKey) => {
  if (!anchorDateKey || !activeDates.includes(anchorDateKey)) return 0;

  let currentStreak = 0;
  let checkStr = anchorDateKey;

  while (activeDates.includes(checkStr)) {
    currentStreak += 1;
    checkStr = addDaysToDateKey(checkStr, -1);
  }

  return currentStreak;
};

export const getNepalDateParts = (date = new Date()) => {
  const parts = nepalDateFormatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
};

export const getNepalDateKey = (date = new Date()) => {
  const { year, month, day } = getNepalDateParts(date);
  return getDateKeyFromParts(year, month, day);
};

export const addDaysToDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return getDateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

export const getNepalWeekdayNarrow = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return nepalWeekdayFormatter.format(new Date(`${getDateKeyFromParts(year, month, day)}T12:00:00+05:45`));
};

export const getNepalMonthCursor = (date = new Date()) => {
  const { year, month } = getNepalDateParts(date);
  return { year, month };
};

export const shiftNepalMonthCursor = ({ year, month }, offset) => {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
};

export const formatNepalMonthLabel = ({ year, month }) => {
  return nepalMonthFormatter.format(new Date(`${getDateKeyFromParts(year, month, 1)}T12:00:00+05:45`));
};

export const getNepalMonthMeta = ({ year, month }) => {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startingDay = (firstDay.getUTCDay() + 6) % 7;
  return { startingDay, daysInMonth };
};

export const getStoredStreakData = (userId) => {
  if (!userId || typeof window === 'undefined') {
    return { activeDates: [], currentStreak: 0 };
  }

  const todayStr = getNepalDateKey();
  const { activeDates, lastOpenedAt } = readStoredStreakState(userId);

  return {
    activeDates,
    currentStreak: calculateCurrentStreak(activeDates, todayStr),
    lastOpenedAt,
  };
};

export const touchStoredStreakData = (userId) => {
  if (!userId || typeof window === 'undefined') {
    return { activeDates: [], currentStreak: 0 };
  }

  const openedAt = new Date();
  const openedAtIso = openedAt.toISOString();
  const todayStr = getNepalDateKey(openedAt);
  let { activeDates } = readStoredStreakState(userId);
  const alreadyTouchedToday = activeDates.includes(todayStr);

  if (!alreadyTouchedToday) {
    activeDates = [...activeDates, todayStr].sort();
  }

  activeDates = Array.from(new Set(activeDates)).sort();
  const currentStreak = calculateCurrentStreak(activeDates, todayStr);

  try {
    saveStoredStreakState(userId, activeDates, todayStr, openedAtIso);
  } catch {}

  if (!alreadyTouchedToday) {
    window.dispatchEvent(new CustomEvent(STREAK_UPDATED_EVENT, { detail: { userId } }));
  }

  return {
    activeDates,
    currentStreak,
    lastOpenedAt: openedAtIso,
  };
};
