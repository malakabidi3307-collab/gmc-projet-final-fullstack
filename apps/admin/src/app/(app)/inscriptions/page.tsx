import { RequireRole } from "@/components/ifag/role-context";
import { EnrollmentsView } from "@/components/ifag/enrollments-view";

export default function Page() {
  return <RequireRole roles={["admin"]}><EnrollmentsView /></RequireRole>;
}
