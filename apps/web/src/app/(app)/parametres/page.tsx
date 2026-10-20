import { RequireRole } from "@/components/ifag/role-context";
import { SettingsView } from "@/components/ifag/settings-view";

export default function Page() {
  return <RequireRole roles={["admin"]}><SettingsView /></RequireRole>;
}
