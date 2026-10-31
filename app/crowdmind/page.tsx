import Crowdmind, { CrowdmindHeader } from "@/components/Crowdmind";
import RoleGate from "@/components/RoleGate";

export const metadata = { title: "Crowdmind" };

export default function CrowdmindPage() {
  return (
    <RoleGate>
      <div className="wrap section" style={{ paddingTop: 36 }}>
        <CrowdmindHeader />
        <Crowdmind />
      </div>
    </RoleGate>
  );
}
