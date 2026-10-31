"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Post, Tag } from "@/lib/crowdmind/schema";
import { SPACE_INFO, canPost, postableSpaces, readableSpaces, type Role, type Space } from "@/lib/roles";
import { usePrefs } from "./Prefs";

const TAG_LABEL: Record<Tag, string> = { stock: "Stock", offer: "Offer", order_call: "Order call", quote_request: "Quote request", other: "Other" };

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

function Feed({ role }: { role: Role }) {
  const { name } = usePrefs();
  const spaces = readableSpaces(role);
  const [space, setSpace] = useState<Space | "all">("all");
  const [tag, setTag] = useState<Tag | "all">("all");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [postSpace, setPostSpace] = useState<Space>(postableSpaces(role)[0]);
  const [author, setAuthor] = useState(name);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<{ reason: string } | null>(null);
  const [posted, setPosted] = useState(false);

  useEffect(() => { if (name && !author) setAuthor(name); }, [name, author]);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const q = space === "all" ? "" : `?space=${space}`;
      const res = await fetch(`/api/crowdmind/posts${q}`, { headers: { "x-convoza-role": role } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't load posts.");
      setPosts(data.posts);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load posts."); }
    finally { setLoading(false); }
  }, [role, space]);
  useEffect(() => { refresh(); }, [refresh]);

  const submit = async () => {
    setBusy(true); setBlocked(null); setError(null); setPosted(false);
    try {
      const res = await fetch("/api/crowdmind/posts", {
        method: "POST", headers: { "Content-Type": "application/json", "x-convoza-role": role },
        body: JSON.stringify({ space: postSpace, author: author.trim() || "Anonymous", text: body }),
      });
      const data = await res.json();
      if (res.status === 422 && data.blocked) setBlocked({ reason: data.reason });
      else if (!res.ok) setError(data.error ?? "Couldn't publish this post.");
      else { setBody(""); setPosted(true); refresh(); }
    } catch { setError("Network error. Try again."); }
    finally { setBusy(false); }
  };

  const shown = useMemo(() => posts.filter((p) => (tag === "all" || p.tag === tag) &&
    (!query.trim() || `${p.text} ${p.summary} ${p.author}`.toLowerCase().includes(query.trim().toLowerCase()))), [posts, tag, query]);

  return (
    <div className="grid" style={{ gap: 28 }}>
      <section className="card" aria-labelledby="compose-h">
        <h2 className="h3" id="compose-h">Post to Crowdmind</h2>
        <p className="muted" style={{ marginTop: 0 }}>Gemma checks every post before it goes live. Posts that ask for OTPs, UPI PINs or advance fees are blocked.</p>
        <div className="grid grid-3">
          <div><label className="lbl" htmlFor="cm-author">Posting as</label><input id="cm-author" className="field" value={author} maxLength={60} onChange={(e) => setAuthor(e.target.value)} /></div>
          <div><label className="lbl" htmlFor="cm-space">Space</label>
            <select id="cm-space" className="field" value={postSpace} onChange={(e) => setPostSpace(e.target.value as Space)}>
              {postableSpaces(role).map((s) => <option key={s} value={s}>{SPACE_INFO[s].label}</option>)}
            </select></div>
        </div>
        <label className="lbl" htmlFor="cm-body" style={{ marginTop: 12 }}>Your post</label>
        <textarea id="cm-body" className="field" style={{ minHeight: 100, fontFamily: "inherit" }} maxLength={600} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Stock, an offer, a group order call, or a request for quotes. Include prices if you have them." />
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary" disabled={busy || body.trim().length < 8 || !canPost(role, postSpace)} onClick={submit}>{busy ? "Gemma is checking…" : "Check and post"}</button>
          <span className="muted">{body.length}/600</span>
          {posted && <span style={{ color: "var(--ok)", fontWeight: 600 }} role="status">✓ Posted</span>}
        </div>
        {blocked && <div className="alert alert-bad" role="alert" style={{ marginTop: 12 }}><b>Blocked.</b> {blocked.reason}</div>}
        {error && <div className="alert alert-bad" role="alert" style={{ marginTop: 12 }}>{error}</div>}
      </section>

      <section aria-labelledby="feed-h">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <h2 className="h3" id="feed-h" style={{ margin: 0 }}>Feed</h2>
          <button className="btn btn-sm" onClick={refresh}>Refresh</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }} role="group" aria-label="Space">
          <button className="chip chip-btn" aria-pressed={space === "all"} onClick={() => setSpace("all")}>All</button>
          {spaces.map((s) => <button key={s} className="chip chip-btn" aria-pressed={space === s} onClick={() => setSpace(s)}>{SPACE_INFO[s].label}</button>)}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }} role="group" aria-label="Tag">
          {(["all", "stock", "offer", "order_call", "quote_request"] as const).map((t) => (
            <button key={t} className="chip chip-btn" aria-pressed={tag === t} onClick={() => setTag(t)}>{t === "all" ? "Any type" : TAG_LABEL[t]}</button>
          ))}
          <input className="field" style={{ maxWidth: 220 }} placeholder="Search posts" aria-label="Search posts" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {loading ? <p className="muted">Loading posts…</p> : shown.length === 0 ? <p className="muted">No posts match. Be the first to post something.</p> : (
          <div className="grid grid-2">
            {shown.map((p) => (
              <article key={p.id} className="card" style={{ boxShadow: "-3px 4px 0 var(--ink)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <b>{p.author}</b><span className="muted">{ago(p.createdAt)}</span>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}><span className="chip">{TAG_LABEL[p.tag]}</span><span className="chip">{SPACE_INFO[p.space].label}</span></div>
                <p style={{ margin: "0 0 8px", fontWeight: 600 }}>{p.summary}</p>
                <p className="muted" style={{ margin: "0 0 10px" }}>{p.text}</p>
                {p.items.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {p.items.map((it, i) => (
                      <span key={i} className="chip" title={`“${it.source}”`}>{it.variant ? `${it.variant} ` : ""}{it.name}{it.price !== null ? ` · ₹${it.price}${it.unit ? ` / ${it.unit}` : ""}` : ""}</span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function Crowdmind() {
  const { role } = usePrefs();
  if (!role) return null;
  return <Feed role={role} />;
}

export function CrowdmindHeader() {
  return (
    <>
      <h1 className="h2"><span className="brush">Crowdmind</span></h1>
      <p className="lead" style={{ marginBottom: 24 }}>A community feed where shops, groups and buyers share stock, offers and quotes. Prices are pulled out and scams are blocked. <Link href="/start">Change role</Link></p>
    </>
  );
}
