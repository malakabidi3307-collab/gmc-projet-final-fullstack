import { RequireRole } from "@/components/ifag/role-context";
import { UsersView } from "@/components/ifag/users-view";

export default function Page() {
  return <RequireRole roles={["admin"]}><UsersView /></RequireRole>;
}
