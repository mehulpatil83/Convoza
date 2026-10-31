"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LANGS } from "@/lib/i18n";
import { THEMES, usePrefs } from "./Prefs";
import { Arrow, Logo, Spark } from "./Art";

function Menu({ label, short, children }: { label: string; short: string; children: (close: () => void) => React.ReactNode }) {
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
      <button className="btn btn-sm" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}><span className="menu-long">{label}</span><span className="menu-short" aria-hidden="true">{short}</span></button>
      {open && <div className="menu-pop" role="menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}

export default function Header() {
  const { t, theme, setTheme, lang, setLang } = usePrefs();
  return (
    <header className="hdr">
      <div className="wrap wrap-wide hdr-in">
        <Link href="/" className="brand" aria-label="Convoza home"><Logo /><span>Convoza</span></Link>
        <div style={{ flex: 1 }} />
        <nav className="nav" aria-label="Main">
          <Link href="/#usage">{t("howto")}</Link>
          <Link href="/#features">{t("features")}</Link>
          <Link href="/crowdmind">{t("crowdmind")}</Link>
          <Link href="/#trust">{t("about")}</Link>
        </nav>
        <div style={{ flex: 1 }} />
        <Menu label={t("theme")} short="◐">
          {(close) => THEMES.map((th) => (
            <button key={th.id} role="menuitemradio" aria-checked={theme === th.id} onClick={() => { setTheme(th.id); close(); }}>{th.label}</button>
          ))}
        </Menu>
        <Menu label={`अ ${t("language")}`} short="अ">
          {(close) => LANGS.map((l) => (
            <button key={l.code} role="menuitemradio" aria-checked={lang === l.code} onClick={() => { setLang(l.code); close(); }}>{l.label}</button>
          ))}
        </Menu>
        <span className="get-started">
          <Link href="/build" className="btn btn-dark btn-sm">{t("getStarted")} <Arrow size={18} /></Link>
          <Spark className="spark-hdr" />
        </span>
      </div>
    </header>
  );
}
