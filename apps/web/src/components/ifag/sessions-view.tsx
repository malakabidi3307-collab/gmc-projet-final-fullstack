"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sessions } from "@/lib/services";
import { useCurrentUser } from "./role-context";
import { DataBoundary } from "./state-views";
import { useResource } from "@/hooks/use-resource";

import { DemoNotice, PageHeader } from "./page-header";
import { PAGE_SIZE, TablePager } from "./table-pager";
import { ToneBadge, type Tone } from "./tone-badge";
import type { SessionStatus } from "@/types";

const STATUS: Record<SessionStatus, { label: string; tone: Tone }> = {
  open: { label: "Ouverte", tone: "success" },
  full: { label: "Complète", tone: "danger" },
  "no-trainer": { label: "Sans formateur", tone: "warning" },
  ended: { label: "Terminée", tone: "neutral" },
};

export function SessionsView() {
  const [q, setQ] = useState(""); const [page, setPage] = useState(0);
  const { user } = useCurrentUser();
  const { data, loading, error, reload } = useResource(sessions);
  const mine = user.role === "trainer" ? data.filter((s) => s.trainer === user.name) : data;
  const filtered = useMemo(() => mine.filter((s) => s.course.toLowerCase().includes(q.toLowerCase())), [mine, q]);
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <PageHeader title="Sessions" description="Organisez les sessions de formation." actions={user.role === "admin" ? <Button>Nouvelle session</Button> : undefined} />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
      <Tabs defaultValue="list" className="gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <TabsList>
            <TabsTrigger value="list">Liste</TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          </TabsList>
          <Input aria-label="Rechercher une session" placeholder="Rechercher une formation" className="h-10 max-w-xs" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <TabsContent value="list" className="grid gap-4">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Formation</TableHead><TableHead>Formateur</TableHead><TableHead>Dates</TableHead><TableHead>Horaires</TableHead>
                <TableHead>Lieu</TableHead><TableHead>Places</TableHead><TableHead>Statut</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Aucune session ne correspond à votre recherche.</TableCell></TableRow>
                ) : rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.course}</TableCell>
                    <TableCell>{s.trainer ?? <span className="text-muted-foreground">Non assigné</span>}</TableCell>
                    <TableCell>{s.start} → {s.end}</TableCell>
                    <TableCell>{s.time}</TableCell>
                    <TableCell>{s.location}</TableCell>
                    <TableCell>{s.enrolled} / {s.capacity}</TableCell>
                    <TableCell><ToneBadge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</ToneBadge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePager total={filtered.length} page={page} onPage={setPage} label="session(s)" />
        </TabsContent>
        <TabsContent value="calendar">
          {/* Vue calendrier simplifiée (liste chronologique). Une grille mensuelle viendra avec la page Emploi du temps. */}
          <ol className="grid gap-3">
            {[...filtered].sort((a, b) => a.start.split("/").reverse().join().localeCompare(b.start.split("/").reverse().join())).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-4 text-sm">
                <div><p className="font-medium">{s.course}</p><p className="text-muted-foreground">{s.start} · {s.time} · {s.location}</p></div>
                <ToneBadge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</ToneBadge>
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>
      </DataBoundary>
      <div className="mt-4"><DemoNotice /></div>
    </>
  );
}
