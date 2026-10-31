"use client";

import { ACTION_INFO, ACTION_KINDS, type ActionKind } from "@/lib/analyze/constants";
import type { ChatAnalysis } from "@/lib/analyze/schema";

export default function ChatSummary({ analysis, active, stale, busy, onPick }: {
  analysis: ChatAnalysis; active: ActionKind | null; stale: boolean; busy: boolean; onPick: (k: ActionKind) => void;
}) {
  const suggested = analysis.suggestions;
  const others = ACTION_KINDS.filter((k) => !suggested.some((s) => s.kind === k) && !(k === "receipt" && analysis.messageCount === 0));
  const who = analysis.participants.slice(0, 6).map((p) => p.name).join(", ");
  const more = analysis.participants.length - 6;
  return (
    <div className="card" aria-labelledby="sum-h">
      <h2 className="h3" id="sum-h">{analysis.title}</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {analysis.messageCount > 0 ? `${analysis.messageCount} messages` : "Pasted text"}{who && ` · ${who}${more > 0 ? ` +${more}` : ""}`}
      </p>
      {analysis.alerts.length > 0 && (
        <div className="alert alert-bad" role="alert" style={{ marginBottom: 12 }}>
          <b>⚠ Possible scam</b>
          {analysis.alerts.map((a, i) => <p key={i} style={{ margin: "4px 0 0" }}>{a}</p>)}
        </div>
      )}
      <p style={{ margin: "0 0 12px", whiteSpace: "pre-line" }}>{analysis.summary}</p>

      {analysis.keyPoints.length > 0 && (<><p className="lbl" style={{ marginBottom: 4 }}>Key points</p>
        <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>{analysis.keyPoints.map((k, i) => <li key={i}>{k.point} <span className="quote">“{k.source}”</span></li>)}</ul></>)}
      {analysis.decisions.length > 0 && (<><p className="lbl" style={{ marginBottom: 4 }}>Decided</p>
        <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>{analysis.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul></>)}
      {analysis.openQuestions.length > 0 && (<><p className="lbl" style={{ marginBottom: 4 }}>Still open</p>
        <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>{analysis.openQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul></>)}

      <hr style={{ border: 0, borderTop: "2px dashed var(--line)", margin: "14px 0" }} />
      <p className="lbl">{suggested.length > 0 ? "What would you like to make?" : "Nothing obvious to build from this chat. You can still try:"}</p>
      {stale && <p className="muted" style={{ marginTop: 0 }}>You changed the chat. Press Analyze chat again to refresh this.</p>}
      <div className="grid" style={{ gap: 10 }}>
        {suggested.map((s) => (
          <div key={s.kind}>
            <button className="btn btn-primary btn-sm card-btn" aria-pressed={active === s.kind} disabled={stale || busy} onClick={() => onPick(s.kind)}>{ACTION_INFO[s.kind].label}</button>
            <span className="muted" style={{ marginLeft: 10 }}>{s.reason || ACTION_INFO[s.kind].blurb}</span>
          </div>
        ))}
      </div>
      {others.length > 0 && (
        <>
          <p className="muted" style={{ margin: "14px 0 6px" }}>Other tools</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {others.map((k) => <button key={k} className="btn btn-sm card-btn" title={ACTION_INFO[k].blurb} aria-pressed={active === k} disabled={stale || busy} onClick={() => onPick(k)}>{ACTION_INFO[k].label}</button>)}
          </div>
        </>
      )}
      <p className="muted" style={{ margin: "14px 0 0", fontSize: ".88rem" }}>Summaries are written by Gemma. The quoted words are checked against your chat. Please read before you share.</p>
    </div>
  );
}
