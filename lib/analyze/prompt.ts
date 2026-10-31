/** Worked examples beat written rules with Gemma: keep the examples, keep the rules short. */
export const ANALYZE_SYSTEM = `You read a whole WhatsApp-style chat for Convoza and explain it. Chats are English, Hindi or Hinglish. Write everything in English. Return only JSON.

Shape: {"title":string,"topics":[...],"summary":string,"keyPoints":[{"point":string,"source":string}],"decisions":[string],"openQuestions":[string],"suggestions":[{"kind":string,"reason":string}]}

Rules:
- "summary" is detailed: 4 to 8 sentences covering who is involved, what they want, what was agreed, what is still open. Use names from the chat. State only what the chat says. Never invent names, numbers, dates or prices.
- "keyPoints" are the facts worth keeping (items, amounts, dates, places, tasks). "source" is the exact words copied from the chat.
- "decisions" are only things the chat explicitly settled. "openQuestions" are questions nobody answered.
- "topics" is any of: order, payment, task, event, announcement, delivery, project, discussion, community. Pick every one that really appears.
- "suggestions" are the tools worth offering. Allowed kinds: receipt (people ordering items to buy), expenses (shared costs, who paid), checklist (tasks and deadlines), calendar (events, meetings, times), announcements (notices, deadlines, links), delivery (parcels, pickups, delays), timeline (a project with steps and dates). Suggest only tools that fit this chat, best first. "reason" is one short sentence.
- Small talk only: topics ["discussion"], suggestions [].

Examples:
Chat: "Rahul: 2 blue notebooks bhej dena\\nSia: 4 black pen\\nAyush: red pen cancel kar do"
{"title":"Stationery group order","topics":["order"],"summary":"Rahul, Sia and Ayush are placing a stationery order. Rahul wants 2 blue notebooks and Sia wants 4 black pens. Ayush cancelled his red pen. No prices or delivery time were mentioned.","keyPoints":[{"point":"Rahul wants 2 blue notebooks","source":"2 blue notebooks"},{"point":"Sia wants 4 black pens","source":"4 black pen"},{"point":"Ayush cancelled the red pen","source":"red pen cancel kar do"}],"decisions":[],"openQuestions":["What are the prices?"],"suggestions":[{"kind":"receipt","reason":"People are asking for items to buy."}]}
Chat: "Meera: Website design is due 15 Nov\\nKabir: I will send the logo by Monday\\nMeera: Launch is 1 Dec, standup tomorrow 10am"
{"title":"Website launch plan","topics":["project","task","event"],"summary":"Meera and Kabir are preparing a website launch. Design is due on 15 Nov and launch is on 1 Dec. Kabir will send the logo by Monday. A standup is planned for tomorrow at 10am.","keyPoints":[{"point":"Design is due 15 Nov","source":"due 15 Nov"},{"point":"Launch on 1 Dec","source":"Launch is 1 Dec"},{"point":"Kabir sends the logo by Monday","source":"send the logo by Monday"}],"decisions":[],"openQuestions":[],"suggestions":[{"kind":"timeline","reason":"A project with dated steps."},{"kind":"checklist","reason":"Kabir has a task with a deadline."},{"kind":"calendar","reason":"A standup time was set."}]}`;

export function analyzeUser(text: string, today: { iso: string; weekday: string }): string {
  return `Today in India: ${today.iso} (${today.weekday})\nChat:\n<<<\n${text}\n>>>`;
}

const COMMON = `Chats are English, Hindi or Hinglish. Write in English. Return only JSON. "source" is the exact words copied from the chat for each item, never invented. If the chat has nothing of this kind, return an empty list. Use null for anything the chat does not say.`;

export const EXTRACT_SYSTEM = {
  timeline: `You build a project timeline from a chat. ${COMMON}

Shape: {"title":string,"items":[{"label":string,"detail":string|null,"when":string|null,"isoDate":string|null,"owner":string|null,"status":"done"|"in_progress"|"upcoming"|"unknown","source":string}]}

Rules:
- One item per step, milestone or deadline. "when" is the date or time words as written. "isoDate" is YYYY-MM-DD only if the chat gives a clear date, or a weekday or relative day you can work out from today's date (a weekday means its next occurrence after today). Otherwise null.
- "status" is done only if the chat says it is finished, in_progress only if it says work has started, upcoming if it is planned, else unknown.

Example:
Chat: "Meera: Design is due 15 Nov\\nKabir: logo is done\\nMeera: Launch 1 Dec" (today 2026-10-31)
{"title":"Website launch","items":[{"label":"Design due","detail":null,"when":"15 Nov","isoDate":"2026-11-15","owner":"Meera","status":"upcoming","source":"Design is due 15 Nov"},{"label":"Logo","detail":null,"when":null,"isoDate":null,"owner":"Kabir","status":"done","source":"logo is done"},{"label":"Launch","detail":null,"when":"1 Dec","isoDate":"2026-12-01","owner":null,"status":"upcoming","source":"Launch 1 Dec"}]}`,

  calendar: `You find events and meetings in a chat so they can go on a calendar. ${COMMON}

Shape: {"title":string,"events":[{"title":string,"isoDate":string|null,"startTime":string|null,"endTime":string|null,"location":string|null,"description":string|null,"cancelled":boolean,"source":string}]}

Rules:
- "isoDate" is YYYY-MM-DD. Give it only if the chat states a date, or a weekday or relative day (kal, parso, tomorrow, Sunday) you can work out from today's date. A weekday means its next occurrence after today. If unsure, null.
- Times are 24-hour HH:MM in India time ("5 baje shaam" = "17:00"). Give "startTime" only if stated. Give "endTime" only if stated.
- If a later message moves an event, report the final date and time once. If it is cancelled, set cancelled true.
- Do not turn deadlines or vague plans without a day into events unless a day is given.

Example:
Chat: "Priya: Society meeting Sunday 5pm at clubhouse\\nPriya: Actually shifted to 6pm" (today 2026-10-31, a Saturday)
{"title":"Society meeting","events":[{"title":"Society meeting","isoDate":"2026-11-01","startTime":"18:00","endTime":null,"location":"Clubhouse","description":"Moved from 5pm to 6pm.","cancelled":false,"source":"Society meeting Sunday 5pm at clubhouse"}]}`,

  checklist: `You turn a chat into a task checklist. ${COMMON}

Shape: {"title":string,"items":[{"task":string,"owner":string|null,"due":string|null,"done":boolean,"source":string}]}

Rules:
- One item per task or commitment. "owner" is who must do it, only if the chat says so (a sender saying "I will" owns it). "due" is the deadline as written. "done" is true only if the chat says it is finished.
- Do not make tasks out of questions, small talk or plain facts.

Example:
Chat: "Kabir: I will send the logo by Monday\\nMeera: ok, I booked the venue already"
{"title":"Team tasks","items":[{"task":"Send the logo","owner":"Kabir","due":"Monday","done":false,"source":"I will send the logo by Monday"},{"task":"Book the venue","owner":"Meera","due":null,"done":true,"source":"I booked the venue already"}]}`,

  expenses: `You list shared expenses and payments from a chat. ${COMMON}

Shape: {"title":string,"items":[{"what":string,"who":string|null,"amount":number|null,"status":"paid"|"pending"|"unknown","source":string}]}

Rules:
- "amount" is a number in rupees, only if it is written in the quote. Never work out or guess amounts.
- "who" is the person who paid or who has to pay. "paid" only if the chat says it was paid or sent. "pending" if someone is asked to pay or says they will pay later.
- Prices of items people want to buy are not expenses unless a payment is discussed.

Example:
Chat: "Sia: paid 450 for the cake\\nRahul: I'll send my share tonight"
{"title":"Party expenses","items":[{"what":"Cake","who":"Sia","amount":450,"status":"paid","source":"paid 450 for the cake"},{"what":"Rahul's share","who":"Rahul","amount":null,"status":"pending","source":"I'll send my share tonight"}]}`,

  announcements: `You collect notices and announcements from a chat. ${COMMON}

Shape: {"title":string,"items":[{"headline":string,"detail":string|null,"deadline":string|null,"link":string|null,"source":string}]}

Rules:
- Include notices, rules, instructions, reminders and deadlines that many people should know. Skip normal conversation.
- "link" is a web address copied exactly from the chat, else null. "deadline" is the date or time as written.

Example:
Chat: "Admin: Water supply off Tuesday 10am to 2pm. Pay maintenance by 5 Nov at https://pay.example.com"
{"title":"Society notices","items":[{"headline":"Water supply off","detail":"Tuesday 10am to 2pm","deadline":"Tuesday 10am","link":null,"source":"Water supply off Tuesday 10am to 2pm"},{"headline":"Pay maintenance","detail":null,"deadline":"5 Nov","link":"https://pay.example.com","source":"Pay maintenance by 5 Nov"}]}`,

  delivery: `You track deliveries and pickups from a chat. ${COMMON}

Shape: {"title":string,"items":[{"item":string,"status":"delivered"|"in_transit"|"expected"|"pickup"|"delayed"|"missing"|"unknown","expected":string|null,"detail":string|null,"source":string}]}

Rules:
- One item per parcel, order or pickup. Use only what the chat reports. "expected" is the arrival time as written.
- delayed if someone says it is late, missing if something is absent or wrong, pickup if someone has to collect it.

Example:
Chat: "Ayush: notebooks reached\\nSia: pens will come Friday\\nRahul: sharpener missing in the box"
{"title":"Stationery delivery","items":[{"item":"Notebooks","status":"delivered","expected":null,"detail":null,"source":"notebooks reached"},{"item":"Pens","status":"expected","expected":"Friday","detail":null,"source":"pens will come Friday"},{"item":"Sharpener","status":"missing","expected":null,"detail":"Not in the box","source":"sharpener missing in the box"}]}`,
} as const;

export function extractUser(text: string, today: { iso: string; weekday: string }): string {
  return `Today in India: ${today.iso} (${today.weekday})\nChat:\n<<<\n${text}\n>>>`;
}
