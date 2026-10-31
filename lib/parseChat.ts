export interface ChatMessage {
  id: number;
  sender: string;
  time?: string;
  text: string;
}

// Android: "12/05/24, 10:15 - Rahul: text"  |  "12/05/2024, 10:15 pm - Rahul: text"
const ANDROID = /^(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\s+[-\u2013]\s+(.*)$/;
// iOS: "[12/05/24, 10:15:30 AM] Rahul: text"
const IOS = /^\[(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)\]\s+(.*)$/;

const SKIP_BODY = /^(<media omitted>|<attachment:.*>|image omitted|video omitted|sticker omitted|audio omitted|this message was deleted|you deleted this message|null)$/i;
const INVISIBLE = /[\u200e\u200f\u202a-\u202e]/g;

function splitSender(rest: string): { sender: string; text: string } | null {
  const idx = rest.indexOf(": ");
  if (idx <= 0 || idx > 60) return null; // system lines have no "Sender: "
  return { sender: rest.slice(0, idx).trim(), text: rest.slice(idx + 2) };
}

/**
 * Turn exported or copied WhatsApp text into messages.
 * Handles Android and iOS exports, multi-line messages, and plain "Name: text" copies.
 */
export function parseChat(raw: string): ChatMessage[] {
  const lines = raw.replace(/\r\n?/g, "\n").replace(INVISIBLE, "").split("\n");
  const out: Omit<ChatMessage, "id">[] = [];
  // In a timestamped export, only timestamped lines start a message; other lines continue the last one.
  const timestamped = lines.some((l) => ANDROID.test(l) || IOS.test(l));
  let current: Omit<ChatMessage, "id"> | null = null;

  for (const line of lines) {
    const m = line.match(ANDROID) ?? line.match(IOS);
    if (m) {
      const parsed = splitSender(m[3]);
      if (parsed) {
        current = { sender: parsed.sender, time: `${m[1]} ${m[2]}`, text: parsed.text };
        out.push(current);
      } else {
        current = null; // system message ("Messages are end-to-end encrypted", "X joined")
      }
      continue;
    }
    const plain = timestamped ? null : splitSender(line);
    if (plain && /^[^\d\s][^:]*$/.test(plain.sender)) {
      current = { sender: plain.sender, text: plain.text };
      out.push(current);
      continue;
    }
    if (current && line.trim()) current.text += "\n" + line.trim();
  }

  return out
    .map((m) => ({ ...m, text: m.text.trim() }))
    .filter((m) => m.text && !SKIP_BODY.test(m.text))
    .map((m, i) => ({ id: i, ...m }));
}
