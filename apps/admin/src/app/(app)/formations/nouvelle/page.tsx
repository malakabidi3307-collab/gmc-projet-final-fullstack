import { RequireRole } from "@/components/ifag/role-context";
import { CourseFormPage } from "@/components/ifag/course-form-page";

export default function Page() {
  return <RequireRole roles={["admin"]}><CourseFormPage /></RequireRole>;
}
