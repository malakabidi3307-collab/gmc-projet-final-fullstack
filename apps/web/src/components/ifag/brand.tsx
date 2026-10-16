import { cn } from "@/lib/utils";

// Symbole typographique temporaire : à remplacer par le logo institutionnel.
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-lg bg-primary font-[family-name:var(--font-display)] text-lg text-primary-foreground" aria-hidden="true">IF</span>
      <span className="font-semibold">IFAG Formation</span>
    </div>
  );
}
