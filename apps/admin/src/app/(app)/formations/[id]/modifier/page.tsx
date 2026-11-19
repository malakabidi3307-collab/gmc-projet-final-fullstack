import { RequireRole } from "@/components/ifag/role-context";
import { CourseEditPage } from "@/components/ifag/course-edit-page";

export default function Page() {
  return <RequireRole roles={["admin"]}><CourseEditPage /></RequireRole>;
}