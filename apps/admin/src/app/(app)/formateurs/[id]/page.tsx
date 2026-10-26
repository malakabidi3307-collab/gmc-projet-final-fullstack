import { RequireRole } from "@/components/ifag/role-context";
import { TrainerDetail } from "@/components/ifag/detail-views";

export default function Page() {
  return <RequireRole roles={["admin"]}><TrainerDetail /></RequireRole>;
}
