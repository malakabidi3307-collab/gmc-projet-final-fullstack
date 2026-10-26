import { RequireRole } from "@/components/ifag/role-context";
import { ReportsView } from "@/components/ifag/reports-view";

export default function Page() {
  return <RequireRole roles={["admin"]}><ReportsView /></RequireRole>;
}
