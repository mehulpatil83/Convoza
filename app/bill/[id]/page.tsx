"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { billToText, upiLink, type Bill } from "@/lib/bill";
import { formatPaise } from "@/lib/money";

function Qr({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(value, { margin: 1, width: 180 }).then(setSrc).catch(() => setSrc("")); }, [value]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={label} width={140} height={140} /> : null;
}

export default function BillPage() {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<Bill | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const all: Bill[] = JSON.parse(localStorage.getItem("convoza.bills") ?? "[]");
      setBill(all.find((b) => b.id === id) ?? null);
    } catch { setBill(null); }
  }, [id]);

  if (bill === undefined) return <div className="wrap section muted">Loading…</div>;
  if (bill === null) {
    return (
      <div className="wrap section">
        <h1 className="h2">Bill <span className="brush">not found</span></h1>
        <p className="lead">Bills are saved in this browser. Open it on the device where you made it, or build a new one.</p>
        <Link href="/build" className="btn btn-primary">Build a Convoza</Link>
      </div>
    );
  }
  const text = billToText(bill);
  return (
    <div className="wrap section" style={{ maxWidth: 820 }}>
      <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => window.print()}>Print or save as PDF</button>
        <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* blocked */ } }}>{copied ? "✓ Copied!" : "Copy for WhatsApp"}</button>
        <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>Share on WhatsApp</a>
        <Link href="/build" className="btn">Back to builder</Link>
      </div>

      <article className="nb" style={{ padding: "22px 30px 14px" }} aria-label={`Bill ${bill.number}`}>
        <h1 className="nb-title">Bill <span className="brush">{bill.number}</span></h1>
        <div className="nb-row muted"><span>{bill.dateIST} (IST)</span><span>{bill.mode === "group" ? "Group bill" : bill.mode === "shop" ? "Customer bill" : "Personal bill"}</span></div>
        <div className="nb-row"><span>From: <b>{bill.from}</b></span><span>To: <b>{bill.to}</b></span></div>

        {bill.people.map((p) => (
          <div key={p.name} style={{ marginTop: 16 }}>
            {bill.mode !== "personal" && bill.mode !== "shop" && <div className="nb-row"><b style={{ fontSize: "1.1rem" }}>{p.name}</b><b>{formatPaise(p.totalPaise)}</b></div>}
            <table className="tbl" style={{ background: "transparent" }}>
              <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {p.lines.map((l, i) => <tr key={i}><td>{l.name}</td><td className="num">{l.qty}</td><td className="num">{formatPaise(l.unitPaise)}</td><td className="num">{formatPaise(l.totalPaise)}</td></tr>)}
                {p.sharePaise > 0 && <tr><td colSpan={3}>Shared charges {bill.mode === "group" ? "(your share)" : ""}</td><td className="num">{formatPaise(p.sharePaise)}</td></tr>}
              </tbody>
            </table>
            {bill.upiId && p.totalPaise > 0 && (
              <div className="no-print-qr" style={{ display: "flex", gap: 14, alignItems: "center", margin: "8px 0" }}>
                <Qr value={upiLink(bill.upiId, bill.from, p.totalPaise, `Convoza ${bill.number}`)} label={`UPI QR for ${p.name}, ${formatPaise(p.totalPaise)}`} />
                <div>
                  <p style={{ margin: 0 }}><b>{p.name}</b> pays <b>{formatPaise(p.totalPaise)}</b></p>
                  <a className="no-print" href={upiLink(bill.upiId, bill.from, p.totalPaise, `Convoza ${bill.number}`)}>Open in a UPI app</a>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="nb-row nb-total" style={{ marginTop: 12 }}><span>Grand total</span><span className="brush">{formatPaise(bill.grandPaise)}</span></div>
        <p style={{ margin: "10px 0 8px", fontWeight: 600, lineHeight: 1.5 }}>{bill.words}</p>
      </article>
    </div>
  );
}
