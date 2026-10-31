"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildOrder, orderToCsv, orderToShopText, type MessageReading, type MessageStatus } from "@/lib/aggregate";
import { createBills, grandTotal, isValidUpiId, whoOwes, type Bill } from "@/lib/bill";
import { formatPaise, parsePriceToPaise } from "@/lib/money";
import { parseChat, type ChatMessage } from "@/lib/parseChat";
import { ROLE_INFO } from "@/lib/roles";
import { SAMPLE_CHAT } from "@/lib/sample";
import type { ReadResult } from "@/lib/schema";
import { usePrefs } from "./Prefs";

const MAX_MESSAGES = 300;
const CONCURRENCY = 4;
const STATUS_LABEL: Record<MessageStatus, string> = { added: "✓ Added", cancelled: "✕ Cancelled", ignored: "– Ignored", needs_check: "? Needs a check" };

interface HistoryEntry { id: string; at: string; text: string; readings: MessageReading[]; resolutions: Record<string, number> }

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

async function readOne(m: ChatMessage): Promise<MessageReading> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sender: m.sender, text: m.text.slice(0, 1000) }) });
      const data = await res.json();
      if (res.ok) return { message: m, result: (data.result as ReadResult) };
      if (res.status === 429 && attempt === 0) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      return { message: m, result: null, error: data.error ?? "Couldn't read this message." };
    } catch {
      if (attempt === 1) return { message: m, result: null, error: "Network error. Check your connection and try again." };
    }
  }
  return { message: m, result: null, error: "Couldn't read this message." };
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function Builder() {
  const { role, name } = usePrefs();
  const [text, setText] = useState("");
  const [readings, setReadings] = useState<MessageReading[]>([]);
  const [phase, setPhase] = useState<"idle" | "reading" | "done">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, number>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [openMsg, setOpenMsg] = useState<number | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [shared, setShared] = useState("");
  const [upi, setUpi] = useState("");
  const [fromName, setFromName] = useState("");
  const [bills, setBills] = useState<Bill[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const runId = useRef(0);

  useEffect(() => {
    setHistory(load<HistoryEntry[]>("convoza.history", []));
    setUpi(load<string>("convoza.upi", ""));
    fetch("/api/health").then(async (r) => { if (!r.ok) { const d = await r.json().catch(() => ({})); setHealth(d.detail ?? "Gemma isn't reachable."); } }).catch(() => {});
    if (new URLSearchParams(window.location.search).get("sample") === "1") setText(SAMPLE_CHAT);
  }, []);
  useEffect(() => { if (name && !fromName) setFromName(name); }, [name, fromName]);

  const order = useMemo(() => buildOrder(readings, resolutions), [readings, resolutions]);
  const priceMap = useMemo(() => {
    const m: Record<string, number | null> = {};
    for (const g of order.groups) m[g.key] = parsePriceToPaise(prices[g.key] ?? "");
    return m;
  }, [order.groups, prices]);
  const total = grandTotal(order, priceMap);
  const owes = whoOwes(order, priceMap);

  const build = useCallback(async (source: string) => {
    setError(null); setBills([]); setNotice(null); setResolutions({}); setCustom({}); setOpenMsg(null);
    const messages = parseChat(source);
    if (messages.length === 0) { setError("No messages found. Paste a chat like “Rahul: 2 pens”, or upload a WhatsApp export."); return; }
    if (messages.length > MAX_MESSAGES) { setError(`That chat has ${messages.length} messages. Paste up to ${MAX_MESSAGES} at a time.`); return; }
    const id = ++runId.current;
    setPhase("reading"); setProgress({ done: 0, total: messages.length });
    const out: MessageReading[] = new Array(messages.length);
    let next = 0, done = 0;
    const worker = async () => {
      while (next < messages.length && runId.current === id) {
        const i = next++;
        out[i] = await readOne(messages[i]);
        done++;
        if (runId.current === id) setProgress({ done, total: messages.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, messages.length) }, worker));
    if (runId.current !== id) return;
    setReadings(out); setPhase("done");
    const entry: HistoryEntry = { id: String(Date.now()), at: new Date().toISOString(), text: source, readings: out, resolutions: {} };
    const hist = [entry, ...load<HistoryEntry[]>("convoza.history", [])].slice(0, 8);
    save("convoza.history", hist); setHistory(hist);
  }, []);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 2200); };
  const copy = async (s: string, label: string) => { try { await navigator.clipboard.writeText(s); flash(`✓ ${label} copied`); } catch { flash("Couldn't copy. Select and copy manually."); } };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2_000_000) { setError("That file is too large. Export the chat without media."); return; }
    setText(await f.text());
  };

  const makeBills = () => {
    if (!role) return;
    if (upi && !isValidUpiId(upi)) { setError("That UPI ID doesn't look right. It should look like name@bank."); return; }
    const sharedP = shared.trim() ? parsePriceToPaise(shared) : 0;
    if (sharedP === null) { setError("Shared charges should be an amount like 30 or 30.50."); return; }
    setError(null);
    if (upi) save("convoza.upi", upi);
    const made = createBills({ role, order, prices: priceMap, fromName: fromName || name, groupName: fromName || name, sharedChargePaise: sharedP, upiId: upi || undefined });
    if (made.length === 0 || made.every((b) => b.people.length === 0)) { setError("Add at least one price first. Bills are made from priced items."); return; }
    const all = [...made, ...load<Bill[]>("convoza.bills", [])].slice(0, 60);
    save("convoza.bills", all); setBills(made);
  };

  const openHistory = (h: HistoryEntry) => { setText(h.text); setReadings(h.readings); setResolutions(h.resolutions); setPhase("done"); setBills([]); };
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const hasOrder = phase === "done";
  const pricedAny = order.groups.some((g) => priceMap[g.key] != null);

  return (
    <div className="wrap section" style={{ paddingTop: 36 }}>
      <h1 className="h2 serif">Build a Convoza</h1>
      <p className="muted" style={{ marginTop: 0 }}>Signed in as {role ? ROLE_INFO[role].label : "…"}. <Link href="/start">Change role</Link></p>

      {health && <div className="alert alert-bad" role="alert" style={{ marginBottom: 16 }}><b>Gemma isn&apos;t ready.</b> {health}</div>}
      {error && <div className="alert alert-bad" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid grid-2" style={{ gap: 24, alignItems: "start" }}>
        <div className="card">
          <label className="lbl" htmlFor="chat">Paste the chat</label>
          <textarea id="chat" className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder={"Rahul: 2 blue notebooks bhej dena\nAyush: red pen cancel kar do"} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button className="btn btn-primary" disabled={phase === "reading" || !text.trim()} onClick={() => build(text)}>{phase === "reading" ? "Reading…" : "Build order"}</button>
            <button className="btn" onClick={() => setText(SAMPLE_CHAT)}>Load sample chat</button>
            <label className="btn" style={{ cursor: "pointer" }}>Upload .txt<input type="file" accept=".txt,text/plain" className="sr" onChange={(e) => onFile(e.target.files?.[0])} /></label>
          </div>
          {phase === "reading" && (
            <div style={{ marginTop: 14 }} role="status">
              <div style={{ height: 8, background: "var(--paper-2)", borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", transition: "width .2s" }} /></div>
              <p className="muted" style={{ margin: "6px 0 0" }}>Reading message {progress.done} of {progress.total}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="h3">Recent convozas</h2>
          {history.length === 0 ? <p className="muted" style={{ margin: 0 }}>Nothing yet. Your last few orders will appear here.</p> : (
            <div className="grid" style={{ gap: 8 }}>
              {history.slice(0, 4).map((h) => (
                <button key={h.id} className="btn btn-sm" style={{ justifyContent: "space-between" }} onClick={() => openHistory(h)}>
                  <span>{new Date(h.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span><span className="muted">{h.readings.length} messages</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasOrder && (
        <div className="grid" style={{ gap: 28, marginTop: 36 }}>
          {order.flags.length > 0 && (
            <section aria-labelledby="flags-h">
              <h2 className="h3" id="flags-h">Needs a check ({order.flags.length})</h2>
              <div className="grid grid-2">
                {order.flags.map((f) => (
                  <div key={f.id} className="alert">
                    <b>⚠ {f.kind === "quantity" ? "Quantity unclear" : f.kind === "reference" ? "Unclear reference" : "Couldn't read"}</b>
                    <p style={{ margin: "4px 0 2px" }}><b>{f.sender}:</b> <span className="quote">“{f.source}”</span></p>
                    <p style={{ margin: "0 0 10px" }}>{f.question}</p>
                    {f.kind === "quantity" && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {[1, 2, 5].map((n) => <button key={n} className="chip chip-btn" onClick={() => setResolutions((r) => ({ ...r, [f.id]: n }))}>{n}</button>)}
                        <input className="field" style={{ width: 90 }} type="number" min={1} placeholder="Custom" aria-label="Custom quantity" value={custom[f.id] ?? ""} onChange={(e) => setCustom((c) => ({ ...c, [f.id]: e.target.value }))} />
                        <button className="chip chip-btn" onClick={() => { const n = Math.floor(Number(custom[f.id])); if (n > 0) setResolutions((r) => ({ ...r, [f.id]: n })); }}>Add</button>
                      </div>
                    )}
                    {f.kind === "unreadable" && <button className="btn btn-sm" onClick={() => build(text)}>Try again</button>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="nb-h">
            <h2 className="h3" id="nb-h">Your Convoza</h2>
            {order.groups.length === 0 ? <p className="muted">No items yet. Answer the questions above or paste a different chat.</p> : (
              <div className="nb">
                <h3 className="nb-title serif">Today&apos;s Convoza</h3>
                {order.groups.map((g) => (
                  <div key={g.key}>
                    <div className="nb-row"><b>{g.name}</b><b>{g.total}</b></div>
                    {g.lines.map((l, i) => (
                      <div key={i} className="nb-row muted" style={{ fontSize: ".92rem" }}><span>{l.sender} · <span className="quote">“{l.source}”</span></span><span>{l.qty}</span></div>
                    ))}
                  </div>
                ))}
                {order.cancelled.map((c, i) => <div key={i} className="nb-row" style={{ color: "var(--bad)" }}><span>× {c.name} ({c.sender})</span><span>Cancelled</span></div>)}
                <div className="nb-row"><b>Total items</b><b>{order.totalItems}</b></div>
              </div>
            )}
          </section>

          <section aria-labelledby="msgs-h">
            <h2 className="h3" id="msgs-h">How every message was read</h2>
            <div className="grid" style={{ gap: 6 }}>
              {readings.map(({ message: m }) => {
                const u = order.understanding[m.id];
                if (!u) return null;
                const open = openMsg === m.id;
                return (
                  <div key={m.id} className="card" style={{ padding: 10 }}>
                    <button onClick={() => setOpenMsg(open ? null : m.id)} aria-expanded={open}
                      style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12, width: "100%" }}>
                      <span><b>{m.sender}</b>: {m.text.length > 80 ? m.text.slice(0, 80) + "…" : m.text}</span>
                      <span className={`chip chip-${u.status}`}>{STATUS_LABEL[u.status]}</span>
                    </button>
                    {open && (
                      <div style={{ marginTop: 10 }}>
                        <p className="muted" style={{ margin: 0 }}>Original message</p><p style={{ margin: "0 0 8px" }}>“{m.text}”</p>
                        <p className="muted" style={{ margin: 0 }}>Convoza understood</p><p style={{ margin: "0 0 8px", fontWeight: 600 }}>{u.understood}</p>
                        <p className="muted" style={{ margin: 0 }}>Source words</p><p style={{ margin: 0 }}>{u.sourceWords.map((s, i) => <span key={i} className="quote" style={{ marginRight: 6 }}>“{s}”</span>)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {order.groups.length > 0 && (
            <section aria-labelledby="price-h" className="grid grid-2" style={{ gap: 24, alignItems: "start" }}>
              <div className="card" style={{ overflowX: "auto" }}>
                <h2 className="h3" id="price-h">Add prices</h2>
                <table className="tbl">
                  <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price ₹</th><th className="num">Total</th></tr></thead>
                  <tbody>
                    {order.groups.map((g) => {
                      const p = priceMap[g.key];
                      const bad = (prices[g.key] ?? "").trim() !== "" && p === null;
                      return (
                        <tr key={g.key}>
                          <td>{g.name}</td><td className="num">{g.total}</td>
                          <td className="num"><input className="field" style={{ width: 90, textAlign: "right", padding: "6px 8px", borderColor: bad ? "var(--bad)" : undefined }} inputMode="decimal" aria-label={`Price for ${g.name}`} aria-invalid={bad}
                            value={prices[g.key] ?? ""} onChange={(e) => setPrices((x) => ({ ...x, [g.key]: e.target.value }))} /></td>
                          <td className="num">{p == null ? "" : formatPaise(p * g.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr><td colSpan={3}><b>Grand total</b></td><td className="num"><b>{formatPaise(total)}</b></td></tr></tfoot>
                </table>
              </div>
              <div className="card">
                <h2 className="h3">Who owes what</h2>
                {owes.length === 0 ? <p className="muted" style={{ margin: 0 }}>Type a price to see each person&apos;s share.</p> : owes.map((w) => (
                  <div key={w.name} className="nb-row" style={{ borderBottom: "1px solid var(--line)" }}><span>{w.name}</span><b>{formatPaise(w.paise)}</b></div>
                ))}
              </div>
            </section>
          )}

          {order.groups.length > 0 && (
            <section className="card" aria-labelledby="act-h">
              <h2 className="h3" id="act-h">Send, export or bill</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={() => copy(orderToShopText(order, "Today's Convoza", pricedAny ? total : undefined, formatPaise), "Order")}>Copy order for shop</button>
                <button className="btn" disabled={owes.length === 0} onClick={() => copy(owes.map((w) => `${w.name} — ${formatPaise(w.paise)}`).join("\n"), "Who owes what")}>Copy who owes what</button>
                <button className="btn" onClick={() => download("convoza-order.csv", orderToCsv(order, priceMap), "text/csv")}>Download CSV</button>
                <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(orderToShopText(order, "Today's Convoza", pricedAny ? total : undefined, formatPaise))}`}>Share on WhatsApp</a>
              </div>
              <span aria-live="polite" style={{ color: "var(--ok)", fontWeight: 600, display: "block", minHeight: 24, marginTop: 8 }}>{notice}</span>
              <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "12px 0 16px" }} />
              <h3 className="h3">Generate a bill</h3>
              <p className="muted" style={{ marginTop: 0 }}>{role ? `From ${ROLE_INFO[role].billFrom}, to ${ROLE_INFO[role].billTo}.` : ""}</p>
              <div className="grid grid-3">
                <div><label className="lbl" htmlFor="from">{role === "community" ? "Group name" : "Shop name"}</label><input id="from" className="field" value={fromName} onChange={(e) => setFromName(e.target.value)} /></div>
                <div><label className="lbl" htmlFor="shared">Shared charges ₹ (delivery, packing)</label><input id="shared" className="field" inputMode="decimal" value={shared} onChange={(e) => setShared(e.target.value)} placeholder="0" /></div>
                <div><label className="lbl" htmlFor="upi">UPI ID for payment QR (optional)</label><input id="upi" className="field" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@bank" /></div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={makeBills} disabled={!pricedAny}>Generate bill</button>
              {bills.length > 0 && (
                <div className="grid" style={{ gap: 8, marginTop: 16 }}>
                  {bills.map((b) => (
                    <Link key={b.id} href={`/bill/${b.id}`} className="btn" style={{ justifyContent: "space-between" }}>
                      <span>{b.number} · {b.mode === "group" ? "Group bill" : `To ${b.to}`}</span><b>{formatPaise(b.grandPaise)} →</b>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
