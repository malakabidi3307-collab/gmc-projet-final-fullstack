import type { ReactNode } from "react";
import { USE_DEMO } from "@/lib/config";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function DemoNotice() {
  if (!USE_DEMO) return null;
  return <p className="text-xs text-muted-foreground">Données de démonstration — non connectées à l’API.</p>;
}
