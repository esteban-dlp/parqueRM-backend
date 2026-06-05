export const GUATEMALA_TIME_ZONE = 'America/Guatemala';
const GUATEMALA_UTC_OFFSET_HOURS = 6;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function partsFor(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: GUATEMALA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function guatemalaTodayISO(date = new Date()): string {
  const parts = partsFor(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDaysISO(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function guatemalaDateStartUtc(dateString: string): Date {
  const dateOnly = DATE_ONLY_RE.test(dateString) ? dateString : dateString.slice(0, 10);
  return new Date(`${dateOnly}T${String(GUATEMALA_UTC_OFFSET_HOURS).padStart(2, '0')}:00:00.000Z`);
}

export function guatemalaDateEndUtc(dateString: string): Date {
  const dateOnly = DATE_ONLY_RE.test(dateString) ? dateString : dateString.slice(0, 10);
  const nextDate = addDaysISO(dateOnly, 1);
  return new Date(`${nextDate}T${String(GUATEMALA_UTC_OFFSET_HOURS - 1).padStart(2, '0')}:59:59.999Z`);
}

export function guatemalaDateRangeUtc(from?: string, to?: string): { from?: Date; to?: Date } {
  return {
    from: from ? guatemalaDateStartUtc(from) : undefined,
    to: to ? guatemalaDateEndUtc(to) : undefined,
  };
}

export function guatemalaTodayRangeUtc(date = new Date()): { start: Date; end: Date } {
  const today = guatemalaTodayISO(date);
  return {
    start: guatemalaDateStartUtc(today),
    end: guatemalaDateEndUtc(today),
  };
}

export function guatemalaDaysAgoISO(days: number, date = new Date()): string {
  return addDaysISO(guatemalaTodayISO(date), -days);
}
