import { RequireRole } from "@/components/ifag/role-context";
import { StudentsView } from "@/components/ifag/students-view";

export default function Page() {
  return <RequireRole roles={["admin"]}><StudentsView /></RequireRole>;
}
