/** Plain constants shared by the browser and the server (no zod, so the browser bundle stays small). */

/** What Convoza can build from a chat. One per intelligence module. */
export const ACTION_KINDS = ["receipt", "expenses", "checklist", "calendar", "announcements", "delivery", "timeline"] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];
export type ExtractKind = Exclude<ActionKind, "receipt">;

/** What the chat is about. A chat can be about several things. */
export const TOPICS = ["order", "payment", "task", "event", "announcement", "delivery", "project", "discussion", "community"] as const;
export type Topic = (typeof TOPICS)[number];

export const ACTION_INFO: Record<ActionKind, { label: string; blurb: string }> = {
  receipt: { label: "Create receipt", blurb: "Group the items people asked for into one order and exact bills." },
  expenses: { label: "Create expense summary", blurb: "List shared expenses and who has paid or still owes." },
  checklist: { label: "Create task checklist", blurb: "Turn tasks, owners and deadlines into a tick-off list." },
  calendar: { label: "Create Google Calendar schedule", blurb: "Add the events and timings to Google Calendar." },
  announcements: { label: "Create announcements digest", blurb: "Pull out notices, deadlines and links worth keeping." },
  delivery: { label: "Create delivery tracker", blurb: "Track what has arrived, what is late and what is missing." },
  timeline: { label: "Create interactive timeline", blurb: "Lay out the project's steps, owners and dates in order." },
};

export const ANALYZE_MAX_CHARS = 24000;
