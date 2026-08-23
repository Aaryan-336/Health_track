import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';

/**
 * Timezone discipline for the whole app.
 *
 * Rule: every instant is stored in UTC. A "day" for streaks, daily scores and
 * rollups is the *user's* calendar day, so we derive a `localDate` string
 * ("YYYY-MM-DD") from their timezone at write time and query on that.
 */

export type LocalDate = string; // YYYY-MM-DD

const FALLBACK_TZ = 'UTC';

export function safeTimezone(tz: string | null | undefined): string {
  if (!tz) return FALLBACK_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return FALLBACK_TZ;
  }
}

/** The user's calendar date for a given instant. */
export function localDateFor(instant: Date, timezone: string): LocalDate {
  return formatInTimeZone(instant, safeTimezone(timezone), 'yyyy-MM-dd');
}

/** The user's calendar date right now. */
export function todayLocalDate(timezone: string): LocalDate {
  return localDateFor(new Date(), timezone);
}

/** The user's wall-clock hour right now (0–23). */
export function localHour(timezone: string, instant = new Date()): number {
  return Number(formatInTimeZone(instant, safeTimezone(timezone), 'H'));
}

/** UTC instant at which the user's local day begins. */
export function startOfLocalDayUtc(localDate: LocalDate, timezone: string): Date {
  return fromZonedTime(`${localDate}T00:00:00`, safeTimezone(timezone));
}

/** UTC instant at which the user's local day ends (exclusive). */
export function endOfLocalDayUtc(localDate: LocalDate, timezone: string): Date {
  return startOfLocalDayUtc(shiftLocalDate(localDate, 1), timezone);
}

/** Combine a local date and "HH:mm" into the corresponding UTC instant. */
export function localDateTimeToUtc(
  localDate: LocalDate,
  time: string,
  timezone: string,
): Date {
  const [h = '0', m = '0'] = time.split(':');
  const hh = h.padStart(2, '0');
  const mm = m.padStart(2, '0');
  return fromZonedTime(`${localDate}T${hh}:${mm}:00`, safeTimezone(timezone));
}

export function shiftLocalDate(localDate: LocalDate, days: number): LocalDate {
  return formatInTimeZone(addDays(parseISO(`${localDate}T12:00:00Z`), days), 'UTC', 'yyyy-MM-dd');
}

/** Inclusive list of local dates, oldest first. */
export function localDateRange(from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard++ < 1000) {
    out.push(cursor);
    cursor = shiftLocalDate(cursor, 1);
  }
  return out;
}

/** The last `count` local dates ending at `end` (inclusive), oldest first. */
export function lastNLocalDates(end: LocalDate, count: number): LocalDate[] {
  return localDateRange(shiftLocalDate(end, -(count - 1)), end);
}

export function daysBetweenLocalDates(a: LocalDate, b: LocalDate): number {
  return differenceInCalendarDays(parseISO(`${b}T12:00:00Z`), parseISO(`${a}T12:00:00Z`));
}

/** Monday-first week containing `localDate`. */
export function weekOf(localDate: LocalDate): LocalDate[] {
  const dow = Number(formatInTimeZone(parseISO(`${localDate}T12:00:00Z`), 'UTC', 'i')); // 1=Mon
  const monday = shiftLocalDate(localDate, -(dow - 1));
  return localDateRange(monday, shiftLocalDate(monday, 6));
}

export function formatLocalDate(localDate: LocalDate, pattern = 'EEE d MMM'): string {
  return formatInTimeZone(parseISO(`${localDate}T12:00:00Z`), 'UTC', pattern);
}

export function formatInstant(
  instant: Date,
  timezone: string,
  pattern = 'h:mm a',
): string {
  return formatInTimeZone(instant, safeTimezone(timezone), pattern);
}

export function zonedNow(timezone: string): Date {
  return toZonedTime(new Date(), safeTimezone(timezone));
}

/**
 * Quiet hours may wrap past midnight ("22:00" → "07:30"), so the comparison
 * has to handle both the same-day and wrapped cases.
 */
export function isWithinQuietHours(
  timezone: string,
  quietStart: string | null,
  quietEnd: string | null,
  instant = new Date(),
): boolean {
  if (!quietStart || !quietEnd) return false;
  const now = formatInTimeZone(instant, safeTimezone(timezone), 'HH:mm');
  if (quietStart === quietEnd) return false;
  return quietStart < quietEnd
    ? now >= quietStart && now < quietEnd
    : now >= quietStart || now < quietEnd;
}

/** Next instant strictly after `from` at the given local wall-clock time. */
export function nextLocalOccurrence(
  timezone: string,
  time: string,
  from = new Date(),
): Date {
  const today = localDateFor(from, timezone);
  const candidate = localDateTimeToUtc(today, time, timezone);
  if (candidate > from) return candidate;
  return localDateTimeToUtc(shiftLocalDate(today, 1), time, timezone);
}

export function greetingFor(timezone: string): string {
  const h = localHour(timezone);
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}

export const COMMON_TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
];
