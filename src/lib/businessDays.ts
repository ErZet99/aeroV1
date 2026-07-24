export function businessDaysBetween(
  fromISO: string,
  toISO: string,
  holidays: string[]
): number {
  const from = new Date(fromISO);
  const to = new Date(toISO);

  // Normalize to start of day
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  const holidaySet = new Set(holidays);
  const step = from <= to ? 1 : -1;
  let count = 0;

  let current = new Date(from);
  if (step > 0) {
    current.setDate(current.getDate() + 1);
  } else {
    current.setDate(current.getDate() - 1);
  }

  while ((step > 0 && current <= to) || (step < 0 && current >= to)) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
      count++;
    }

    current.setDate(current.getDate() + step);
  }

  return step > 0 ? count : -count;
}

export function calendarDaysSince(fromISO: string, todayISO: string): number {
  const from = new Date(fromISO);
  const today = new Date(todayISO);

  from.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
