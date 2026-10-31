/* Small illustrations from the design reference: logo, spark lines, star, icons. Pure SVG, no dependencies. */

export function Logo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <g strokeLinejoin="round" strokeWidth="4.5">
        <path d="M5 35 L21 14 L31 38 Z" fill="var(--red)" stroke="var(--red)" />
        <path d="M23 9 L40 4 L36 24 Z" fill="var(--red)" stroke="var(--red)" style={{ fill: "color-mix(in srgb, var(--red) 80%, #fff)", stroke: "color-mix(in srgb, var(--red) 80%, #fff)" }} />
        <path d="M32 31 L45 28 L38 43 Z" fill="var(--red)" stroke="var(--red)" />
      </g>
    </svg>
  );
}

export function Spark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={`spark ${className ?? ""}`} style={style} viewBox="0 0 44 44" aria-hidden="true">
      <path d="M6 6 L18 16" /><path d="M24 3 L26 18" /><path d="M2 26 L16 26" />
    </svg>
  );
}

export function Star({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 0 C22 12 28 18 40 20 C28 22 22 28 20 40 C18 28 12 22 0 20 C12 18 18 12 20 0 Z" fill="var(--yellow)" />
    </svg>
  );
}

export function Arrow({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h15" /><path d="M13 5l7 7-7 7" />
    </svg>
  );
}

/** Hand-drawn curved arrow that points back at the call-to-action button. */
export function CurvedArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 110 58" aria-hidden="true">
      <path d="M104 6 C70 4 34 14 12 44" /><path d="M10 28 L12 45 L28 40" />
    </svg>
  );
}

export function Swoosh({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true">
      <path d="M3 9 C70 2 190 4 297 6" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r="22" fill="#3dbb4f" stroke="var(--ink)" strokeWidth="3" />
      <path d="M12 41 l3.2-8.6 A14 14 0 1 1 20 38 Z" fill="#3dbb4f" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M21 19.5 c-1 .4-2 1.6-1.6 3.4 .9 3.6 4.7 7.4 8.4 8.3 1.7.4 3-.7 3.3-1.7 l-2.7-1.9 -1.6 1.2 c-1.9-.8-3.5-2.4-4.4-4.3 l1.2-1.6 -1.9-2.7 Z" fill="#fff" />
    </svg>
  );
}

export function CheckBadge() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="var(--ink)" />
      <path d="M11.5 20.5 l6 6 11-12.5" fill="none" stroke="var(--paper)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BoltIcon() {
  return (
    <svg viewBox="0 0 58 58" aria-hidden="true">
      <path d="M33 3 L11 33 H25 L20 55 L47 22 H31 Z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3.4" strokeLinejoin="round" />
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg viewBox="0 0 58 58" aria-hidden="true" fill="var(--ink)">
      <circle cx="29" cy="15" r="8.5" /><circle cx="11" cy="23" r="6.5" /><circle cx="47" cy="23" r="6.5" />
      <path d="M13 50 c0-10 6-17 16-17 s16 7 16 17 Z" /><path d="M1 46 c0-8 4-14 11-14 l3 2 c-5 4-6 8-6 12 Z" /><path d="M57 46 c0-8-4-14-11-14 l-3 2 c5 4 6 8 6 12 Z" />
    </svg>
  );
}

export function TickIcon() {
  return (
    <svg viewBox="0 0 58 58" aria-hidden="true">
      <circle cx="29" cy="29" r="25" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3.4" />
      <path d="M17 30 l8 8 16-18" fill="none" stroke="var(--ink)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SmileIcon() {
  return (
    <svg viewBox="0 0 58 58" aria-hidden="true">
      <circle cx="29" cy="29" r="25" fill="var(--purple)" stroke="var(--ink)" strokeWidth="3.4" />
      <circle cx="21" cy="23" r="3" fill="var(--ink)" /><circle cx="37" cy="23" r="3" fill="var(--ink)" />
      <path d="M17 33 c4 9 20 9 24 0" fill="none" stroke="var(--ink)" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

/** Page-level shapes behind every page: yellow quarter circle bottom left. */
export function Decor() {
  return (
    <div className="decor" aria-hidden="true">
      <span className="d-yellow" />
    </div>
  );
}
