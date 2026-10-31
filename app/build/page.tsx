import Builder from "@/components/Builder";
import RoleGate from "@/components/RoleGate";

export const metadata = { title: "Build a Convoza" };

export default function BuildPage() {
  return (
    <RoleGate>
      <Builder />
    </RoleGate>
  );
}
