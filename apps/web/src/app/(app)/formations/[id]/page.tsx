import { RequireRole } from "@/components/ifag/role-context";
import { CourseDetail } from "@/components/ifag/detail-views";

export default function Page() {
  return <RequireRole roles={["admin"]}><CourseDetail /></RequireRole>;
}
