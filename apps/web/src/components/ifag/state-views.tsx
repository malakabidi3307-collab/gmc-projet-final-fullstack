import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-5" role="status" aria-label="Chargement en cours">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${95 - i * 12}%` }} />)}
    </div>
  );
}

export function ErrorState({ title = "Une erreur est survenue", message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="grid gap-2 rounded-xl border border-destructive bg-card p-6">
      <h2 className="font-semibold">{title}</h2>
      {message && <p className="text-sm text-destructive">{message}</p>}
      {onRetry && <div><Button variant="outline" onClick={onRetry}>Réessayer</Button></div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-xl border bg-card p-10 text-center">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function Unauthorized() {
  return <EmptyState title="Accès non autorisé" description="Votre rôle ne permet pas d’accéder à cette page." />;
}

export function DataBoundary({ loading, error, onRetry, children }: { loading: boolean; error: string | null; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  return <>{children}</>;
}
