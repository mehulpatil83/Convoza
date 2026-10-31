"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type Lang } from "@/lib/i18n";
import { isRole, type Role } from "@/lib/roles";

export type Theme = "classic" | "vintage" | "mono";
export const THEMES: { id: Theme; label: string }[] = [
  { id: "classic", label: "Convoza Classic" },
  { id: "vintage", label: "Vintage" },
  { id: "mono", label: "Mono" },
];

interface PrefsValue {
  theme: Theme; setTheme: (t: Theme) => void;
  lang: Lang; setLang: (l: Lang) => void;
  t: (key: string) => string;
  role: Role | null; setRole: (r: Role) => void;
  name: string; setName: (n: string) => void;
  ready: boolean;
}

const Ctx = createContext<PrefsValue | null>(null);

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage can be blocked */ }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("classic");
  const [lang, setLangState] = useState<Lang>("en");
  const [role, setRoleState] = useState<Role | null>(null);
  const [name, setNameState] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const th = read("convoza.theme");
    if (th === "classic" || th === "vintage" || th === "mono") setThemeState(th);
    const lg = read("convoza.lang");
    if (lg === "en" || lg === "hi" || lg === "kn" || lg === "gu" || lg === "bn") setLangState(lg);
    const r = read("convoza.role");
    if (isRole(r)) setRoleState(r);
    setNameState(read("convoza.name") ?? "");
    setReady(true);
  }, []);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setTheme = useCallback((t: Theme) => { setThemeState(t); write("convoza.theme", t); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); write("convoza.lang", l); }, []);
  const setRole = useCallback((r: Role) => { setRoleState(r); write("convoza.role", r); }, []);
  const setName = useCallback((n: string) => { setNameState(n); write("convoza.name", n); }, []);
  const t = useCallback((key: string) => translate(lang, key), [lang]);

  const value = useMemo(
    () => ({ theme, setTheme, lang, setLang, t, role, setRole, name, setName, ready }),
    [theme, setTheme, lang, setLang, t, role, setRole, name, setName, ready],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): PrefsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePrefs must be used inside PrefsProvider");
  return v;
}
