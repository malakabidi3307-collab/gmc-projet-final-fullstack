import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Tone = "success" | "warning" | "danger" | "neutral";
const TONE: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

// Toujours un libellé : la couleur ne porte jamais seule l'information.
export function ToneBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge variant="secondary" className={cn("border-0 font-semibold", TONE[tone])}>{children}</Badge>;
}
