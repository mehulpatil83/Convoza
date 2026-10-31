import { describe, expect, it } from "vitest";
import { eventRange, eventsToIcs, googleCalendarUrl, isValidIsoDate, isValidTime, todayIst, type CalEvent } from "./calendar";

const lunch: CalEvent = { title: "Team lunch, Sunday", date: "2026-11-01", start: "13:00", end: null, location: "Café Goodluck", description: "Bring cash" };

describe("dates and times", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("1 Nov")).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
  });
  it("accepts 24h times only", () => {
    expect(isValidTime("17:30")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("5pm")).toBe(false);
  });
  it("gives today's date in India, not UTC", () => {
    expect(todayIst(new Date("2026-10-31T20:00:00Z"))).toEqual({ iso: "2026-11-01", weekday: "Sunday" });
  });
});

describe("event range", () => {
  it("defaults to one hour", () => expect(eventRange(lunch).endTime).toBe("14:00"));
  it("rolls past midnight", () => {
    const r = eventRange({ ...lunch, start: "23:30", end: null });
    expect([r.endDate, r.endTime]).toEqual(["2026-11-02", "00:30"]);
  });
  it("ignores an end that is not after the start", () => expect(eventRange({ ...lunch, end: "12:00" }).endTime).toBe("14:00"));
  it("makes all-day events end the next day", () => {
    const r = eventRange({ ...lunch, start: null });
    expect([r.allDay, r.endDate]).toEqual([true, "2026-11-02"]);
  });
});

describe("Google Calendar link", () => {
  it("builds a timed link in India time", () => {
    const u = new URL(googleCalendarUrl(lunch)!);
    expect(u.searchParams.get("dates")).toBe("20261101T130000/20261101T140000");
    expect(u.searchParams.get("ctz")).toBe("Asia/Kolkata");
    expect(u.searchParams.get("text")).toBe("Team lunch, Sunday");
  });
  it("builds an all-day link", () => expect(new URL(googleCalendarUrl({ ...lunch, start: null })!).searchParams.get("dates")).toBe("20261101/20261102"));
  it("refuses a missing or invalid date", () => {
    expect(googleCalendarUrl({ ...lunch, date: "" })).toBeNull();
    expect(googleCalendarUrl({ ...lunch, date: "2026-02-30" })).toBeNull();
  });
});

describe(".ics export", () => {
  const ics = eventsToIcs([lunch, { ...lunch, date: "" }], new Date("2026-10-31T10:00:00Z"));
  it("converts India time to UTC", () => expect(ics).toContain("DTSTART:20261101T073000Z"));
  it("escapes commas and skips events without a date", () => {
    expect(ics).toContain("SUMMARY:Team lunch\\, Sunday");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
  it("uses CRLF line endings", () => expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true));
});
