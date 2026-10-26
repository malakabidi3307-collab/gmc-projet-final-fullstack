"use client";

import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/use-resource";
import { notifications } from "@/lib/services";
import { PageHeader } from "./page-header";
import { DataBoundary, EmptyState } from "./state-views";
import { ToneBadge } from "./tone-badge";

export function NotificationsView() {
  const { data, loading, error, reload, update } = useResource(notifications);
  const unread = data.filter((n) => !n.read);
  return (
    <>
      <PageHeader title="Notifications" description={`${unread.length} non lue(s)`}
        actions={<Button variant="outline" disabled={unread.length === 0} onClick={() => unread.forEach((n) => update(n.id, { read: true }))}>Tout marquer comme lu</Button>} />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
        {data.length === 0 ? <EmptyState title="Aucune notification" /> : (
          <ul className="grid gap-3">
            {data.map((n) => (
              <li key={n.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 ${n.read ? "" : "border-primary"}`}>
                <div><p className="font-medium">{n.title} {!n.read && <ToneBadge tone="success">Non lue</ToneBadge>}</p><p className="text-sm text-muted-foreground">{n.body} · {n.date}</p></div>
                {!n.read && <Button size="sm" variant="outline" onClick={() => update(n.id, { read: true })}>Marquer comme lu</Button>}
              </li>
            ))}
          </ul>
        )}
      </DataBoundary>
    </>
  );
}
