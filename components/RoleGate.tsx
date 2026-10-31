"use client";

import { ROLES, ROLE_INFO, type Role } from "@/lib/roles";
import { usePrefs } from "./Prefs";

export function RolePicker({ onPick }: { onPick?: (r: Role) => void }) {
  const { role, setRole, name, setName } = usePrefs();
  return (
    <div>
      <div className="grid grid-3 tilt">
        {ROLES.map((r) => (
          <button key={r} className="card card-btn" onClick={() => { setRole(r); onPick?.(r); }} aria-pressed={role === r}
            style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}>
            <h3 className="h3">{ROLE_INFO[r].label}</h3>
            <p className="muted" style={{ margin: 0 }}>{ROLE_INFO[r].blurb}</p>
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 360, marginTop: 20 }}>
        <label className="lbl" htmlFor="display-name">Your name, shop or group name</label>
        <input id="display-name" className="field" value={name} maxLength={60} placeholder="e.g. Hostel B, Sharma Stationers" onChange={(e) => setName(e.target.value)} />
      </div>
      <p className="muted" style={{ marginTop: 12, fontSize: ".9rem" }}>Roles are self-chosen in this demo. A real launch needs verified merchant accounts.</p>
    </div>
  );
}

/** Shows the role picker until a role is chosen, then renders children. */
export default function RoleGate({ children }: { children: React.ReactNode }) {
  const { role, ready } = usePrefs();
  if (!ready) return <div className="wrap section muted">Loading…</div>;
  if (!role) {
    return (
      <div className="wrap section">
        <h1 className="h2">Who are you using Convoza <span className="brush">as?</span></h1>
        <p className="lead" style={{ marginBottom: 24 }}>Your role decides who your bills are from and to, and which Crowdmind space you read.</p>
        <RolePicker />
      </div>
    );
  }
  return <>{children}</>;
}
