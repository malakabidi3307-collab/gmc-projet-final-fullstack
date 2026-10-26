import { RequireRole } from "@/components/ifag/role-context";
import { TrainersView } from "@/components/ifag/trainers-view";

export default function Page() {
  return <RequireRole roles={["admin"]}><TrainersView /></RequireRole>;
}
