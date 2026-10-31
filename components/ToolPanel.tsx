"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { eventsToIcs, googleCalendarUrl, isValidIsoDate, type CalEvent } from "@/lib/calendar";
import { formatPaise, parsePriceToPaise, sumPaise } from "@/lib/money";
import type {
  AnnouncementsResult, CalendarResult, ChecklistResult, DeliveryResult, ExpensesResult, ExtractKind, ExtractResult, TimelineResult,
} from "@/lib/analyze/schema";

async function fetchExtract(kind: ExtractKind, text: string): Promise<ExtractResult> {
  let lastError = "Couldn't read this chat.";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, text }) });
      const data = await res.json();
      if (res.ok) return data.result as ExtractResult;
      lastError = data.error ?? lastError;
      if (res.status === 429 && attempt === 0) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      break;
    } catch {
      lastError = "Network error. Check your connection and try again.";
    }
  }
  throw new Error(lastError);
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function Source({ words }: { words: string }) {
  return <p style={{ margin: "6px 0 0" }}><span className="muted">From the chat: </span><span className="quote">“{words}”</span></p>;
}

function CopyBar({ text, label }: { text: string; label: string }) {
  const [note, setNote] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setNote(`✓ ${label} copied`); } catch { setNote("Couldn't copy. Select and copy manually."); }
    setTimeout(() => setNote(""), 2200);
  };
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 16 }}>
      <button className="btn btn-sm" onClick={copy}>Copy {label}</button>
      <a className="btn btn-sm" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>Share on WhatsApp</a>
      <span aria-live="polite" style={{ color: "var(--ok)", fontWeight: 600 }}>{note}</span>
    </div>
  );
}

/* ---------------- Timeline ---------------- */
const TL_STATUS = { done: "✓ Done", in_progress: "◐ In progress", upcoming: "○ Upcoming", unknown: "· Not stated" } as const;
const TL_CHIP = { done: "chip-added", in_progress: "chip-needs_check", upcoming: "chip-ignored", unknown: "chip-ignored" } as const;

function Timeline({ data }: { data: TimelineResult }) {
  type S = keyof typeof TL_STATUS;
  const [filter, setFilter] = useState<"all" | S>("all");
  const [open, setOpen] = useState<number | null>(null);
  const [override, setOverride] = useState<Record<number, S>>({});
  const items = data.items.map((it, i) => ({ ...it, i, status: (override[i] ?? it.status) as S }));
  const shown = items.filter((it) => filter === "all" || it.status === filter);
  const text = [data.title, ...items.map((it) => `${TL_STATUS[it.status].slice(0, 1)} ${it.when ? it.when + " — " : ""}${it.label}${it.owner ? ` (${it.owner})` : ""}`)].join("\n");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }} role="group" aria-label="Filter steps">
        {(["all", "done", "in_progress", "upcoming"] as const).map((f) => (
          <button key={f} className="chip chip-btn" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? `All (${items.length})` : TL_STATUS[f]}</button>
        ))}
      </div>
      {shown.length === 0 ? <p className="muted">Nothing in this filter.</p> : (
        <div className="nb" style={{ paddingBottom: 18 }}>
          {shown.map((it) => {
            const isOpen = open === it.i;
            return (
              <div key={it.i} className="nb-row" style={{ display: "block" }}>
                <button onClick={() => setOpen(isOpen ? null : it.i)} aria-expanded={isOpen}
                  style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12, width: "100%", alignItems: "baseline" }}>
                  <span><b>{it.label}</b>{it.when && <span className="muted"> · {it.when}</span>}{it.owner && <span className="muted"> · {it.owner}</span>}</span>
                  <span className={`chip ${TL_CHIP[it.status]}`}>{TL_STATUS[it.status]}</span>
                </button>
                {isOpen && (
                  <div style={{ marginTop: 8 }}>
                    {it.detail && <p style={{ margin: "0 0 4px" }}>{it.detail}</p>}
                    <Source words={it.source} />
                    <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setOverride((o) => ({ ...o, [it.i]: it.status === "done" ? "upcoming" : "done" }))}>
                      {it.status === "done" ? "Mark as not done" : "Mark as done"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {items.length > 0 && <CopyBar text={text} label="timeline" />}
    </div>
  );
}

/* ---------------- Calendar ---------------- */
interface EditEvent extends CalEvent { source: string; cancelled: boolean }

function Calendar({ data }: { data: CalendarResult }) {
  const [events, setEvents] = useState<EditEvent[]>(() => data.events.map((e) => ({
    title: e.title, date: e.isoDate ?? "", start: e.startTime, end: e.endTime, location: e.location, description: e.description, source: e.source, cancelled: e.cancelled,
  })));
  const patch = (i: number, p: Partial<EditEvent>) => setEvents((list) => list.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const ready = events.filter((e) => !e.cancelled && isValidIsoDate(e.date));
  return (
    <div className="grid" style={{ gap: 16 }}>
      {events.map((e, i) => {
        const url = e.cancelled ? null : googleCalendarUrl(e);
        return (
          <div key={i} className="card" style={{ padding: 16, boxShadow: "-3px 4px 0 var(--ink)" }}>
            {e.cancelled && <p className="chip chip-cancelled" style={{ marginTop: 0 }}>✕ Cancelled in the chat</p>}
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div><label className="lbl" htmlFor={`ev-t-${i}`}>Event</label><input id={`ev-t-${i}`} className="field" value={e.title} onChange={(x) => patch(i, { title: x.target.value })} /></div>
              <div><label className="lbl" htmlFor={`ev-l-${i}`}>Place</label><input id={`ev-l-${i}`} className="field" value={e.location ?? ""} onChange={(x) => patch(i, { location: x.target.value || null })} /></div>
              <div><label className="lbl" htmlFor={`ev-d-${i}`}>Date</label><input id={`ev-d-${i}`} type="date" className="field" value={e.date} onChange={(x) => patch(i, { date: x.target.value })} /></div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}><label className="lbl" htmlFor={`ev-s-${i}`}>Starts</label><input id={`ev-s-${i}`} type="time" className="field" value={e.start ?? ""} onChange={(x) => patch(i, { start: x.target.value || null })} /></div>
                <div style={{ flex: 1 }}><label className="lbl" htmlFor={`ev-e-${i}`}>Ends</label><input id={`ev-e-${i}`} type="time" className="field" value={e.end ?? ""} onChange={(x) => patch(i, { end: x.target.value || null })} /></div>
              </div>
            </div>
            {e.description && <p style={{ margin: "10px 0 0" }}>{e.description}</p>}
            <Source words={e.source} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
              {url ? <a className="btn btn-primary btn-sm" href={url} target="_blank" rel="noreferrer">Add to Google Calendar</a> : <button className="btn btn-primary btn-sm" disabled>Add to Google Calendar</button>}
              {!e.cancelled && !isValidIsoDate(e.date) && <span className="muted">The chat doesn&apos;t give a clear date. Pick one to continue.</span>}
              {!e.cancelled && isValidIsoDate(e.date) && !e.start && <span className="muted">No time found, so this will be an all-day event.</span>}
            </div>
          </div>
        );
      })}
      {events.length > 0 && (
        <div><button className="btn btn-sm" disabled={ready.length === 0} onClick={() => download("convoza-schedule.ics", eventsToIcs(ready), "text/calendar")}>Download all as .ics ({ready.length})</button></div>
      )}
    </div>
  );
}

/* ---------------- Checklist ---------------- */
function Checklist({ data }: { data: ChecklistResult }) {
  const [done, setDone] = useState<boolean[]>(() => data.items.map((i) => i.done));
  const count = done.filter(Boolean).length;
  const text = [data.title, ...data.items.map((it, i) => `${done[i] ? "[x]" : "[ ]"} ${it.task}${it.owner ? ` (${it.owner})` : ""}${it.due ? ` — by ${it.due}` : ""}`)].join("\n");
  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>{count} of {data.items.length} done</p>
      <div className="nb">
        {data.items.map((it, i) => (
          <div key={i} className="nb-row" style={{ display: "block" }}>
            <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={done[i]} style={{ marginTop: 6, width: 18, height: 18 }} onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))} />
              <span style={{ textDecoration: done[i] ? "line-through" : "none", opacity: done[i] ? 0.6 : 1 }}>
                <b>{it.task}</b>{it.owner && <span className="muted"> · {it.owner}</span>}{it.due && <span className="muted"> · by {it.due}</span>}
              </span>
            </label>
            <Source words={it.source} />
          </div>
        ))}
      </div>
      <CopyBar text={text} label="checklist" />
    </div>
  );
}

/* ---------------- Expenses ---------------- */
const EX_STATUS = { paid: "✓ Paid", pending: "⏳ Pending", unknown: "? Not stated" } as const;

function Expenses({ data }: { data: ExpensesResult }) {
  const rows = data.items.map((it) => ({ ...it, paise: parsePriceToPaise(it.amount) }));
  const sum = (s: "paid" | "pending") => sumPaise(rows.filter((r) => r.status === s && r.paise !== null).map((r) => r.paise as number));
  const noAmount = rows.filter((r) => r.paise === null).length;
  const text = [data.title, ...rows.map((r) => `${EX_STATUS[r.status].slice(0, 1)} ${r.what}${r.who ? ` — ${r.who}` : ""}${r.paise !== null ? ` — ${formatPaise(r.paise)}` : ""}`), `Paid ${formatPaise(sum("paid"))} · Pending ${formatPaise(sum("pending"))}`].join("\n");
  return (
    <div>
      <div className="nb">
        {rows.map((r, i) => (
          <div key={i} className="nb-row" style={{ display: "block" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span><b>{r.what}</b>{r.who && <span className="muted"> · {r.who}</span>}</span>
              <span><b>{r.paise !== null ? formatPaise(r.paise) : "—"}</b> <span className={`chip ${r.status === "paid" ? "chip-added" : r.status === "pending" ? "chip-needs_check" : "chip-ignored"}`}>{EX_STATUS[r.status]}</span></span>
            </div>
            <Source words={r.source} />
          </div>
        ))}
        <div className="nb-row"><span>Paid so far</span><b>{formatPaise(sum("paid"))}</b></div>
        <div className="nb-row nb-total"><span>Still pending</span><span className="brush">{formatPaise(sum("pending"))}</span></div>
      </div>
      {noAmount > 0 && <p className="muted">{noAmount} {noAmount === 1 ? "entry has" : "entries have"} no amount in the chat, so {noAmount === 1 ? "it isn't" : "they aren't"} counted in the totals.</p>}
      <CopyBar text={text} label="summary" />
    </div>
  );
}

/* ---------------- Announcements ---------------- */
function Announcements({ data }: { data: AnnouncementsResult }) {
  const text = [data.title, ...data.items.map((it) => `• ${it.headline}${it.deadline ? ` (by ${it.deadline})` : ""}${it.link ? ` ${it.link}` : ""}`)].join("\n");
  return (
    <div>
      <div className="grid" style={{ gap: 12 }}>
        {data.items.map((it, i) => (
          <div key={i} className="alert">
            <b>{it.headline}</b>{it.deadline && <span className="chip chip-needs_check" style={{ marginLeft: 8 }}>By {it.deadline}</span>}
            {it.detail && <p style={{ margin: "4px 0 0" }}>{it.detail}</p>}
            {it.link && <p style={{ margin: "4px 0 0" }}><a href={it.link} target="_blank" rel="noreferrer">{it.link}</a></p>}
            <Source words={it.source} />
          </div>
        ))}
      </div>
      <CopyBar text={text} label="digest" />
    </div>
  );
}

/* ---------------- Delivery ---------------- */
const DL_STATUS = { delivered: "✓ Delivered", in_transit: "→ On the way", expected: "○ Expected", pickup: "📍 Pickup", delayed: "⚠ Delayed", missing: "✕ Missing", unknown: "· Not stated" } as const;

function Delivery({ data }: { data: DeliveryResult }) {
  const text = [data.title, ...data.items.map((it) => `${DL_STATUS[it.status]} — ${it.item}${it.expected ? ` (${it.expected})` : ""}`)].join("\n");
  const chip = (s: keyof typeof DL_STATUS) => (s === "delivered" ? "chip-added" : s === "delayed" || s === "missing" ? "chip-cancelled" : s === "unknown" ? "chip-ignored" : "chip-needs_check");
  return (
    <div>
      <div className="nb">
        {data.items.map((it, i) => (
          <div key={i} className="nb-row" style={{ display: "block" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span><b>{it.item}</b>{it.expected && <span className="muted"> · {it.expected}</span>}</span>
              <span className={`chip ${chip(it.status)}`}>{DL_STATUS[it.status]}</span>
            </div>
            {it.detail && <p style={{ margin: "4px 0 0" }}>{it.detail}</p>}
            <Source words={it.source} />
          </div>
        ))}
      </div>
      <CopyBar text={text} label="tracker" />
    </div>
  );
}

/* ---------------- Panel: fetch once, then show the right view ---------------- */
const TITLES: Record<ExtractKind, string> = {
  timeline: "Interactive timeline", calendar: "Google Calendar schedule", checklist: "Task checklist",
  expenses: "Expense summary", announcements: "Announcements digest", delivery: "Delivery tracker",
};
const EMPTY: Record<ExtractKind, string> = {
  timeline: "No project steps or dates were found in this chat.", calendar: "No events or meeting times were found in this chat.",
  checklist: "No tasks were found in this chat.", expenses: "No payments or shared expenses were found in this chat.",
  announcements: "No notices or announcements were found in this chat.", delivery: "No deliveries or pickups were found in this chat.",
};

function itemCount(kind: ExtractKind, r: ExtractResult): number {
  return kind === "calendar" ? (r as CalendarResult).events.length : (r as { items: unknown[] }).items.length;
}

export default function ToolPanel({ kind, text, hidden }: { kind: ExtractKind; text: string; hidden: boolean }) {
  const [state, setState] = useState<{ phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; result: ExtractResult }>({ phase: "loading" });
  const run = useCallback(() => {
    setState({ phase: "loading" });
    fetchExtract(kind, text).then((result) => setState({ phase: "ready", result }), (e: Error) => setState({ phase: "error", message: e.message }));
  }, [kind, text]);
  useEffect(() => { run(); }, [run]);

  const body = useMemo(() => {
    if (state.phase !== "ready") return null;
    const r = state.result;
    if (itemCount(kind, r) === 0) return <p className="muted" style={{ margin: 0 }}>{EMPTY[kind]}</p>;
    switch (kind) {
      case "timeline": return <Timeline data={r as TimelineResult} />;
      case "calendar": return <Calendar data={r as CalendarResult} />;
      case "checklist": return <Checklist data={r as ChecklistResult} />;
      case "expenses": return <Expenses data={r as ExpensesResult} />;
      case "announcements": return <Announcements data={r as AnnouncementsResult} />;
      case "delivery": return <Delivery data={r as DeliveryResult} />;
    }
  }, [state, kind]);

  return (
    <section className="card" aria-labelledby={`tool-${kind}`} hidden={hidden}>
      <h2 className="h3" id={`tool-${kind}`}>{TITLES[kind]}{state.phase === "ready" && state.result.title ? ` · ${state.result.title}` : ""}</h2>
      {state.phase === "loading" && <p className="muted" role="status" style={{ margin: 0 }}>Reading the chat…</p>}
      {state.phase === "error" && (
        <div className="alert alert-bad" role="alert">{state.message} <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={run}>Try again</button></div>
      )}
      {body}
    </section>
  );
}
