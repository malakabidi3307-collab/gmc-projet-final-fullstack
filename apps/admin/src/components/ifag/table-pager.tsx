import { Button } from "@/components/ui/button";

export const PAGE_SIZE = 5;

export function TablePager({ total, page, onPage, label }: { total: number; page: number; onPage: (p: number) => void; label: string }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>{total} {label} · page {Math.min(page, pages - 1) + 1} / {pages}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Précédent</Button>
        <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Suivant</Button>
      </div>
    </div>
  );
}
