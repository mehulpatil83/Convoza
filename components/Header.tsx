"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LANGS } from "@/lib/i18n";
import { THEMES, usePrefs } from "./Prefs";

function Menu({ label, children }: { label: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button className="btn btn-sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{label}</button>
      {open && <div className="menu-pop" role="menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}

export default function Header() {
  const { t, theme, setTheme, lang, setLang } = usePrefs();
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <Link href="/" className="brand">convoza<i>.</i></Link>
        <nav className="nav" aria-label="Main">
          <Link href="/#features">{t("features")}</Link>
          <Link href="/#usage">{t("howto")}</Link>
          <Link href="/crowdmind">{t("crowdmind")}</Link>
        </nav>
        <div style={{ flex: 1 }} />
        <Menu label={t("theme")}>
          {(close) => THEMES.map((th) => (
            <button key={th.id} role="menuitemradio" aria-checked={theme === th.id} onClick={() => { setTheme(th.id); close(); }}>{th.label}</button>
          ))}
        </Menu>
        <Menu label={`अ ${t("language")}`}>
          {(close) => LANGS.map((l) => (
            <button key={l.code} role="menuitemradio" aria-checked={lang === l.code} onClick={() => { setLang(l.code); close(); }}>{l.label}</button>
          ))}
        </Menu>
        <Link href="/build" className="btn btn-primary btn-sm">{t("build")}</Link>
      </div>
    </header>
  );
}
