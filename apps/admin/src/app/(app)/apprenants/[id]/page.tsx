import { RequireRole } from "@/components/ifag/role-context";
import { StudentDetail } from "@/components/ifag/detail-views";

export default function Page() {
  return <RequireRole roles={["admin"]}><StudentDetail /></RequireRole>;
}
