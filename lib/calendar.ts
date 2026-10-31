/** Date, time and calendar-link maths. Plain code on purpose: the model only reads words, it never does date arithmetic. */

export const IST_OFFSET_MIN = 330; // India has no daylight saving, so a fixed offset is exact.

export interface CalEvent {
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24h, India time). null = all-day event. */
  start: string | null;
  /** HH:MM. null = default to one hour after start. */
  end: string | null;
  location: string | null;
  description: string | null;
}

export function isValidIsoDate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTime(s: string | null | undefined): s is string {
  if (!s || !/^\d{2}:\d{2}$/.test(s)) return false;
  const [h, m] = s.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Today's date in India, used to resolve "kal", "Sunday", "next Friday". */
export function todayIst(now: Date = new Date()): { iso: string; weekday: string } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", weekday: "long" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { iso: `${get("year")}-${get("month")}-${get("day")}`, weekday: get("weekday") };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Naive local date-time moved by some minutes (no time zone involved). */
function shift(date: string, time: string, minutes: number): { date: string; time: string } {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi + minutes));
  return { date: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`, time: `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}` };
}

const compact = (date: string) => date.replace(/-/g, "");
const compactTime = (time: string) => time.replace(":", "") + "00";

/** Start and end of an event. All-day events end on the next day (calendar convention). */
export function eventRange(e: CalEvent): { allDay: boolean; startDate: string; startTime: string | null; endDate: string; endTime: string | null } {
  if (!e.start || !isValidTime(e.start)) {
    return { allDay: true, startDate: e.date, startTime: null, endDate: shift(e.date, "00:00", 24 * 60).date, endTime: null };
  }
  let end = { date: e.date, time: e.end && isValidTime(e.end) ? e.end : "" };
  // No end given, or an end that is not after the start on the same day: use one hour after start.
  if (!end.time || end.time <= e.start) end = shift(e.date, e.start, 60);
  return { allDay: false, startDate: e.date, startTime: e.start, endDate: end.date, endTime: end.time };
}

/** A "Add to Google Calendar" link. Returns null when the date is missing or invalid. */
export function googleCalendarUrl(e: CalEvent): string | null {
  if (!isValidIsoDate(e.date) || !e.title.trim()) return null;
  const r = eventRange(e);
  const dates = r.allDay
    ? `${compact(r.startDate)}/${compact(r.endDate)}`
    : `${compact(r.startDate)}T${compactTime(r.startTime!)}/${compact(r.endDate)}T${compactTime(r.endTime!)}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title.trim(), dates });
  if (!r.allDay) q.set("ctz", "Asia/Kolkata");
  if (e.location?.trim()) q.set("location", e.location.trim());
  if (e.description?.trim()) q.set("details", e.description.trim());
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold to 75 bytes per line as the iCalendar spec asks. Never splits a character. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length === 0 ? 75 : 74)) { out.push(cur); cur = ch; bytes = b; } else { cur += ch; bytes += b; }
  }
  out.push(cur);
  return out.join("\r\n ");
}

function utcStamp(date: string, time: string): string {
  const s = shift(date, time, -IST_OFFSET_MIN);
  return `${compact(s.date)}T${compactTime(s.time)}Z`;
}

/** An .ics file (opens in Google Calendar, Apple Calendar and Outlook). Events without a valid date are left out. */
export function eventsToIcs(events: CalEvent[], now: Date = new Date()): string {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Convoza//Chat schedule//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  events.forEach((e, i) => {
    if (!isValidIsoDate(e.date) || !e.title.trim()) return;
    const r = eventRange(e);
    lines.push("BEGIN:VEVENT", `UID:convoza-${stamp}-${i}@convoza`, `DTSTAMP:${stamp}`);
    if (r.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${compact(r.startDate)}`, `DTEND;VALUE=DATE:${compact(r.endDate)}`);
    } else {
      lines.push(`DTSTART:${utcStamp(r.startDate, r.startTime!)}`, `DTEND:${utcStamp(r.endDate, r.endTime!)}`);
    }
    lines.push(`SUMMARY:${icsEscape(e.title.trim())}`);
    if (e.location?.trim()) lines.push(`LOCATION:${icsEscape(e.location.trim())}`);
    if (e.description?.trim()) lines.push(`DESCRIPTION:${icsEscape(e.description.trim())}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
