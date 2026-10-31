"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND_SCRIPTS } from "@/lib/i18n";
import { formatPaise, lineTotal, sumPaise } from "@/lib/money";
import { usePrefs } from "./Prefs";
import { Arrow, BoltIcon, CheckBadge, CurvedArrow, Logo, PeopleIcon, SmileIcon, Spark, Star, Swoosh, TickIcon, WhatsAppIcon } from "./Art";

const CHAOS = [
  ["Rahul", "3 blue notebooks"], ["Ayush", "mere liye 2 blue notebook"], ["Rahul", "ok 👍"], ["Ayush", "black pen bhi 2"],
] as const;

const INSPECT = [
  { tone: "added", dot: "🟢", text: "2 blue notebooks", chip: "Added", understood: "Add Blue Notebook × 2" },
  { tone: "needs_check", dot: "🟡", text: "mere liye bhi same", chip: "Needs a check", understood: "Refers to someone else's order. Convoza asks instead of guessing." },
  { tone: "cancelled", dot: "🔴", text: "red pen nahi chahiye", chip: "Cancelled", understood: "Remove Red Pen from the order" },
  { tone: "ignored", dot: "⚪", text: "ok done 👍", chip: "Ignored", understood: "Not an order. Nothing to add." },
  { tone: "needs_check", dot: "🟡", text: "kuch pens bhi", chip: "Needs a check", understood: "Pens requested, quantity missing. Asking." },
] as const;

const GROUPED = [
  { name: "Blue Notebook", total: 5, who: [["Rahul", 3, "3 blue notebooks bhej dena"], ["Ayush", 2, "mere liye 2 blue notebook"]] },
  { name: "Black Pen", total: 7, who: [["Sia", 4, "4 black pen"], ["Rahul", 3, "black pen 3 bhi"]] },
  { name: "A4 Sheets", total: 2, who: [["Ayush", 2, "2 A4 sheets"]] },
] as const;

const PRICE_ROWS = [
  { name: "Blue Notebook", qty: 5, price: "40", by: { Rahul: 3, Ayush: 2 } },
  { name: "Black Pen", qty: 7, price: "10", by: { Sia: 4, Rahul: 3 } },
  { name: "A4 Sheets", qty: 2, price: "85", by: { Ayush: 2 } },
] as const;

// The mock order shown in the hero. Totals come from the same money helpers as the real app, never typed by hand.
const HERO_CHAT = [["Rahul", "3 notebooks"], ["Sneha", "2 pens"], ["Aman", "2 notebooks"]] as const;
const HERO_ROWS = [{ name: "Notebooks", qty: 5, unitPaise: 5000 }, { name: "Pens", qty: 2, unitPaise: 1000 }] as const;

function Hero() {
  const { t } = usePrefs();
  const total = sumPaise(HERO_ROWS.map((r) => lineTotal(r.qty, r.unitPaise)));
  const STRIP = [
    { icon: <BoltIcon />, title: t("stripSmart"), sub: t("stripSmartSub") },
    { icon: <PeopleIcon />, title: t("stripGroup"), sub: t("stripGroupSub") },
    { icon: <TickIcon />, title: t("stripClear"), sub: t("stripClearSub") },
    { icon: <SmileIcon />, title: t("stripDrama"), sub: t("stripDramaSub") },
  ];
  return (
    <section className="section hero">
      <span className="h-yellow-l" aria-hidden="true" />
      <span className="h-yellow-bl" aria-hidden="true" />
      <span className="h-olive-br" aria-hidden="true" />
      <div className="wrap wrap-wide">
        <div className="hero-grid">
          <div>
            <div style={{ position: "relative", display: "inline-block" }}>
              <p className="tag">{t("tag")}</p>
              <Spark style={{ position: "absolute", right: -46, top: -26, width: 44, height: 44 }} />
            </div>
            <h1 className="h1 hero-h1">
              <span className="ln">Aap message bhejo.</span>
              <span className="ln">Baaki hum</span>
              <span className="brush">dekh lenge.</span>
            </h1>
            <Swoosh className="swoosh" />
            <p className="hero-sub">{t("heroSub2")}</p>
            <div className="cta-row">
              <Link href="/build" className="btn btn-primary">{t("startOrder")} <Arrow size={22} /></Link>
              <CurvedArrow className="cta-arrow" />
              <Spark className="cta-spark" style={{ transform: "rotate(200deg)" }} />
            </div>
          </div>

          <div className="hero-art" aria-label="Example: a WhatsApp chat becomes an order summary">
            <span className="blob" aria-hidden="true" />
            <span className="dots" aria-hidden="true" />
            <Star className="star" />
            <div className="sticker sticker-chat">
              <div className="chat-head"><WhatsAppIcon /><span>Friends Group</span></div>
              {HERO_CHAT.map(([who, what]) => <p key={who} className="chat-bubble">{who}: {what}</p>)}
              <time className="chat-time" dateTime="22:24">10:24 PM</time>
            </div>
            <div className="sticker sticker-sum">
              <div className="sum-head"><CheckBadge /><span>Order Summary</span></div>
              {HERO_ROWS.map((r) => <div key={r.name} className="sum-row"><span>{r.name}</span><b>{r.qty}</b></div>)}
              <div className="sum-total"><span>Total</span><span className="brush">{formatPaise(total)}</span></div>
            </div>
          </div>
        </div>

        <div className="strip">
          {STRIP.map((x) => (
            <div key={x.title} className="strip-item">{x.icon}<div><b>{x.title}</b><span>{x.sub}</span></div></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pitch() {
  const { t } = usePrefs();
  return (
    <section className="section">
      <div className="wrap grid grid-2" style={{ alignItems: "center", gap: 48 }}>
        <div>
          <h2 className="h2">{t("heroA")}<br /><span className="brush">{t("heroB")}</span></h2>
          <p className="lead">{t("heroSub")}</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "26px 0" }}>
            <Link href="/build" className="btn btn-primary">{t("build")} <Arrow size={20} /></Link>
            <Link href="/build?sample=1" className="btn">{t("sample")}</Link>
          </div>
          <div className="grid" style={{ gap: 10 }}>
            {["2 blue notebooks bhej dena", "red pen cancel kar do", "5 black pen bhi"].map((m) => <div key={m} className="bubble">{m}</div>)}
          </div>
        </div>
        <div className="nb" aria-label="Today's Convoza example" style={{ transform: "rotate(1.5deg)" }}>
          <h3 className="nb-title">Today&apos;s Convoza</h3>
          <div className="nb-row muted"><span>WhatsApp</span><span>7 messages</span></div>
          <div className="nb-row"><span>✓ Blue Notebook</span><b>2</b></div>
          <div className="nb-row"><span>✓ Black Pen</span><b>5</b></div>
          <div className="nb-row"><span>✓ A4 Sheets</span><b>2</b></div>
          <div className="nb-row" style={{ color: "var(--bad)" }}><span>× Red Pen</span><b>Cancelled</b></div>
          <div className="nb-row nb-total"><span>Total items: 9</span><span className="brush">₹420</span></div>
        </div>
      </div>
    </section>
  );
}

function Chaos() {
  return (
    <section className="section">
      <div className="wrap">
        <h2 className="h2">From chaos to <span className="brush">convoza.</span></h2>
        <p className="lead">Convoza doesn&apos;t copy messages. It reads them, checks them against your words, and organises them.</p>
        <div className="flow" style={{ marginTop: 28 }}>
          <div className="grid" style={{ gap: 8 }}>
            {CHAOS.map(([who, text], k) => <div key={k} className="bubble"><b>{who}</b>{text}</div>)}
          </div>
          <div className="arrow" aria-hidden>→</div>
          <div className="nb" style={{ transform: "rotate(1deg)" }}>
            <h3 className="nb-title">Blue Notebook: 5</h3>
            <div className="nb-row muted"><span>Rahul</span><span>3</span></div>
            <div className="nb-row muted"><span>Ayush</span><span>2</span></div>
            <h3 className="nb-title">Black Pen: 2</h3>
            <div className="nb-row muted"><span>Ayush</span><span>2</span></div>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>Read, understand, verify, organise: every message goes through all four.</p>
      </div>
    </section>
  );
}

const FEATURES = [
  ["Understands intent", "Added, cancelled, ignored, or unclear. Every message gets a clear status."],
  ["Hindi + Hinglish", "\"2 copy bhej dena\" becomes 2 Notebooks."],
  ["No guessing", "Someone says \"some pens\"? Convoza asks: how many?"],
  ["Handles cancels", "\"Pen nahi chahiye ab\" removes that person's pens. \"Same as Rahul\"? It asks instead of guessing."],
  ["Exact words", "Every item shows the message it came from."],
  ["Grouped orders", "Many messages from many people become one clean order."],
] as const;

function Features() {
  return (
    <section className="section" id="features">
      <div className="wrap">
        <h2 className="h2">Convoza understands the mess.</h2>
        <div className="grid grid-3 tilt" style={{ marginTop: 28 }}>
          {FEATURES.map(([h, p]) => (
            <div key={h} className="card"><h3 className="h3">{h}</h3><p className="muted" style={{ margin: 0 }}>{p}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Asks() {
  const [pick, setPick] = useState<number | "custom" | null>(null);
  const [custom, setCustom] = useState("3");
  const qty = pick === "custom" ? Number(custom) : pick;
  return (
    <section className="section">
      <div className="wrap grid grid-2" style={{ gap: 40, alignItems: "center" }}>
        <div>
          <h2 className="h2">If Convoza doesn&apos;t know, it asks.</h2>
          <p className="lead">Convoza never invents an answer just to look smart.</p>
        </div>
        <div className="card">
          <div className="bubble" style={{ marginBottom: 14 }}>Some notebooks bhi bhejna.</div>
          <div className="alert">
            <b>⚠ Quantity unclear</b>
            <p style={{ margin: "4px 0 10px" }}>How many notebooks should I add?</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {[1, 2, 5].map((n) => <button key={n} className="chip chip-btn" aria-pressed={pick === n} onClick={() => setPick(n)}>{n}</button>)}
              <button className="chip chip-btn" aria-pressed={pick === "custom"} onClick={() => setPick("custom")}>Custom</button>
              {pick === "custom" && (
                <input className="field" style={{ width: 90 }} type="number" min={1} value={custom} aria-label="Custom quantity" onChange={(e) => setCustom(e.target.value)} />
              )}
            </div>
          </div>
          {qty && qty > 0 ? <p style={{ margin: "12px 0 0", color: "var(--ok)", fontWeight: 600 }}>✓ Added Notebook × {qty}</p> : null}
        </div>
      </div>
    </section>
  );
}

function Inspector() {
  const [sel, setSel] = useState(0);
  const cur = INSPECT[sel];
  return (
    <section className="section">
      <div className="wrap">
        <h2 className="h2">See how every message was read.</h2>
        <p className="lead">Tap a message to see what Convoza understood.</p>
        <div className="grid grid-2" style={{ marginTop: 24, gap: 24 }}>
          <div className="grid" style={{ gap: 8 }} role="tablist" aria-label="Example messages">
            {INSPECT.map((m, k) => (
              <button key={k} role="tab" aria-selected={sel === k} onClick={() => setSel(k)}
                className="card card-btn" style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit", display: "flex", justifyContent: "space-between", gap: 12, padding: 12, alignItems: "center" }}>
                <span>{m.dot} “{m.text}”</span>
                <span className={`chip chip-${m.tone}`}>{m.chip}</span>
              </button>
            ))}
          </div>
          <div className="card" role="tabpanel" aria-live="polite">
            <p className="muted" style={{ margin: 0 }}>Original message</p>
            <p style={{ margin: "2px 0 14px" }}>“{cur.text}”</p>
            <p className="muted" style={{ margin: 0 }}>Convoza understood</p>
            <p style={{ margin: "2px 0 14px", fontWeight: 600 }}>{cur.understood}</p>
            <p className="muted" style={{ margin: 0 }}>Source words</p>
            <p style={{ margin: "2px 0 0" }}><span className="quote">“{cur.text}”</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Grouped() {
  return (
    <section className="section">
      <div className="wrap">
        <h2 className="h2">One conversation. <span className="brush">One clean order.</span></h2>
        <div className="grid grid-3 tilt" style={{ marginTop: 28 }}>
          {GROUPED.map((g) => (
            <div key={g.name} className="card">
              <h3 className="h3">{g.name}</h3>
              <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{g.total} total</p>
              <p className="muted" style={{ margin: "0 0 12px" }}>{g.who.map(([n, q]) => `${n} · ${q}`).join("  |  ")}</p>
              {g.who.map(([n, q, src]) => (
                <p key={n + src} style={{ margin: "0 0 8px" }}><b>{n}</b>: qty {q}<br /><span className="quote">“{src}”</span></p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Prices() {
  const [prices, setPrices] = useState<Record<string, string>>(Object.fromEntries(PRICE_ROWS.map((r) => [r.name, r.price])));
  const paise = (s: string) => { const n = Number(s); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0; };
  const rows = PRICE_ROWS.map((r) => ({ ...r, total: lineTotal(r.qty, paise(prices[r.name])) }));
  const grand = sumPaise(rows.map((r) => r.total));
  const owes: Record<string, number> = {};
  for (const r of PRICE_ROWS) for (const [who, q] of Object.entries(r.by)) owes[who] = (owes[who] ?? 0) + lineTotal(q, paise(prices[r.name]));
  return (
    <section className="section">
      <div className="wrap grid grid-2" style={{ gap: 40 }}>
        <div>
          <h2 className="h2">Add prices. Know who <span className="brush">owes what.</span></h2>
          <p className="lead">Prices, totals and splits are calculated by code, to the paisa. Try changing a price.</p>
          <h3 className="h3" style={{ marginTop: 24 }}>Who owes what</h3>
          {Object.entries(owes).map(([who, p]) => <p key={who} style={{ margin: "2px 0" }}>{who}: <b>{formatPaise(p)}</b></p>)}
        </div>
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price ₹</th><th className="num">Total</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td><td className="num">{r.qty}</td>
                  <td className="num"><input className="field" style={{ width: 84, textAlign: "right", padding: "6px 8px" }} inputMode="decimal" aria-label={`Price for ${r.name}`}
                    value={prices[r.name]} onChange={(e) => setPrices((p) => ({ ...p, [r.name]: e.target.value }))} /></td>
                  <td className="num">{formatPaise(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={3}><b>Grand total</b></td><td className="num"><b>{formatPaise(grand)}</b></td></tr></tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

function Send() {
  const [copied, setCopied] = useState(false);
  const text = "🧾 Today's Convoza\n5 × Blue Notebook\n7 × Black Pen\n2 × A4 Sheets\nTotal — ₹440";
  return (
    <section className="section">
      <div className="wrap grid grid-2" style={{ gap: 40, alignItems: "center" }}>
        <div>
          <h2 className="h2">Ready to <span className="brush">send.</span></h2>
          <p className="lead">Copy the final order and paste it straight to the shop.</p>
          <button className="btn btn-primary" onClick={async () => {
            try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
          }}>Copy order for shop</button>
          <span aria-live="polite" style={{ marginLeft: 12, color: "var(--ok)", fontWeight: 600 }}>{copied ? "✓ Copied!" : ""}</span>
        </div>
        <pre className="card mono" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{text}</pre>
      </div>
    </section>
  );
}

function Usage() {
  return (
    <section className="section" id="usage">
      <div className="wrap">
        <h2 className="h2">Three steps. <span className="brush">One clean convoza.</span></h2>
        <ol className="steps" style={{ marginTop: 24, maxWidth: 640 }}>
          <li><div><h3 className="h3">Paste the chat</h3><p className="muted" style={{ margin: 0 }}>Paste your WhatsApp conversation, or upload the exported .txt file.</p></div></li>
          <li><div><h3 className="h3">Build the convoza</h3><p className="muted" style={{ margin: 0 }}>Convoza reads and understands each message.</p></div></li>
          <li><div><h3 className="h3">Review and copy</h3><p className="muted" style={{ margin: 0 }}>Check flagged items, add prices, then copy the final order or make a bill.</p></div></li>
        </ol>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="section" id="trust">
      <div className="wrap">
        <p className="tag" style={{ fontSize: "1rem", margin: "0 0 18px" }}>✦ AI-powered order intelligence</p>
        <h2 className="h2" style={{ marginTop: 4 }}>AI where it matters. Code where it counts.</h2>
        <div className="grid grid-2" style={{ marginTop: 24 }}>
          <div className="card"><h3 className="h3">Gemma 4</h3>
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Language understanding</li><li>Intent</li><li>Product extraction</li><li>Hindi and Hinglish</li><li>References</li><li>Ambiguity detection</li>
            </ul></div>
          <div className="card"><h3 className="h3">Convoza engine</h3>
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Validation</li><li>Grouping</li><li>Cancellation</li><li>Calculations</li><li>Order state</li><li>Hallucination protection</li>
            </ul></div>
        </div>
        <p className="lead" style={{ marginTop: 20 }}>Gemma understands the conversation. Convoza makes sure the answer is grounded.</p>
      </div>
    </section>
  );
}

function Cta() {
  const { t } = usePrefs();
  const [i, setI] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setI((x) => (x + 1) % BRAND_SCRIPTS.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="section" style={{ textAlign: "center" }}>
      <div className="wrap">
        <p className="h2" style={{ marginBottom: 6 }}>
          <span className="sr">The Convoza {t("isForEveryone")}</span>
          <span aria-hidden="true">The <span key={i} className="rotor brush">{BRAND_SCRIPTS[i]}</span> {t("isForEveryone")}</span>
        </p>
        <p className="muted" style={{ margin: "0 0 56px" }}>{t("sameMeaning")}</p>
        <h2 className="h2">{t("ctaTitle")}</h2>
        <p className="lead" style={{ margin: "0 auto 28px" }}>{t("ctaSub")}</p>
        <Link href="/build" className="btn btn-primary">{t("ctaBtn")} <Arrow size={22} /></Link>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = usePrefs();
  return (
    <footer className="foot">
      <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "center" }}>
        <div><div className="brand"><Logo /><span>Convoza</span></div><p className="muted" style={{ margin: "6px 0 0" }}>{t("footTag")}</p></div>
        <nav style={{ display: "flex", gap: 22, flexWrap: "wrap" }} aria-label="Footer">
          <Link href="/#top">Product</Link><Link href="/#features">{t("features")}</Link><Link href="/#usage">{t("howto")}</Link>
          <Link href="/crowdmind">{t("crowdmind")}</Link><Link href="/#trust">{t("about")}</Link>
        </nav>
        <p className="muted" style={{ margin: 0 }}>{t("footBuilt")}</p>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (<><Hero /><Pitch /><Chaos /><Features /><Asks /><Inspector /><Grouped /><Prices /><Send /><Usage /><Trust /><Cta /><Footer /></>);
}
