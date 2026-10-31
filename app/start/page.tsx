"use client";

import { useRouter } from "next/navigation";
import { RolePicker } from "@/components/RoleGate";

export default function Start() {
  const router = useRouter();
  return (
    <div className="wrap section">
      <h1 className="h2">Pick your <span className="brush">role</span></h1>
      <p className="lead" style={{ marginBottom: 24 }}>You can change it any time from this page.</p>
      <RolePicker onPick={() => router.push("/build")} />
    </div>
  );
}
