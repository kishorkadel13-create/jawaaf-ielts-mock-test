const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getStoredStreakData = (userId) => {
  if (!userId || typeof window === 'undefined') {
    return { activeDates: [], currentStreak: 0 };
  }

  const storageKey = `user_streak_data_${userId}`;
  let activeDates = [];

  try {
    const savedData = window.localStorage.getItem(storageKey);
    const parsedDates = savedData ? JSON.parse(savedData) : [];
    activeDates = Array.isArray(parsedDates) ? parsedDates.filter(Boolean) : [];
  } catch {
    activeDates = [];
  }

  const todayStr = getLocalDateKey();
  if (!activeDates.includes(todayStr)) {
    activeDates = [...activeDates, todayStr];
    window.localStorage.setItem(storageKey, JSON.stringify(activeDates));
  }

  let currentStreak = 0;
  const checkDate = new Date();

  while (true) {
    const checkStr = getLocalDateKey(checkDate);
    if (!activeDates.includes(checkStr)) break;
    currentStreak += 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return { activeDates, currentStreak };
};
