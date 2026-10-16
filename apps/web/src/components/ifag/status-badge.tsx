import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CourseStatus } from "@/types";

const MAP: Record<CourseStatus, { label: string; className: string }> = {
  published: { label: "Publiée", className: "bg-success-soft text-success" },
  draft: { label: "Brouillon", className: "bg-warning-soft text-warning" },
  archived: { label: "Archivée", className: "bg-muted text-muted-foreground" },
};

// Le statut est toujours exprimé par un libellé, jamais par la couleur seule.
export function StatusBadge({ status }: { status: CourseStatus }) {
  const { label, className } = MAP[status];
  return <Badge variant="secondary" className={cn("border-0 font-semibold", className)}>{label}</Badge>;
}
