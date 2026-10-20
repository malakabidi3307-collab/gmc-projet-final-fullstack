"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { evaluations } from "@/lib/services";
import { DataBoundary } from "./state-views";
import { useResource } from "@/hooks/use-resource";

import { DemoNotice, PageHeader } from "./page-header";
import { ToneBadge, type Tone } from "./tone-badge";
import type { EvaluationStatus } from "@/types";

const STATUS: Record<EvaluationStatus, { label: string; tone: Tone }> = {
  validated: { label: "Validée", tone: "success" }, pending: { label: "En attente", tone: "warning" }, failed: { label: "Non validée", tone: "danger" },
};

export function EvaluationsView({ title = "Évaluations" }: { title?: string }) {
  const [q, setQ] = useState("");
  const { data, loading, error, reload } = useResource(evaluations);
  const list = useMemo(() => data.filter((e) => `${e.title} ${e.course}`.toLowerCase().includes(q.toLowerCase())), [q, data]);
  const graded = data.filter((e) => e.score !== null);
  const avg = (graded.reduce((s, e) => s + (e.score as number), 0) / (graded.length || 1)).toFixed(1).replace(".", ",");
  const validated = data.filter((e) => e.status === "validated").length;
  const pct = Math.round((validated / data.length) * 100);

  return (
    <>
      <PageHeader title={title} description="Résultats et progression par formation." actions={<DemoNotice />} />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Moyenne des notes</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{avg} / 20</p></CardContent></Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Évaluations validées</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-2 text-3xl font-bold">{validated} / {data.length}</p>
            <div role="progressbar" aria-label="Évaluations validées" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
          </CardContent>
        </Card>
      </div>
      <Input aria-label="Rechercher une évaluation" placeholder="Rechercher une évaluation ou une formation" className="mb-4 h-10 max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Évaluation</TableHead><TableHead>Formation</TableHead><TableHead>Note</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.length === 0 ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Aucune évaluation ne correspond à votre recherche.</TableCell></TableRow>
              : list.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}</TableCell><TableCell>{e.course}</TableCell>
                  <TableCell>{e.score === null ? "—" : `${e.score} / ${e.max}`}</TableCell>
                  <TableCell><ToneBadge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</ToneBadge></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      </DataBoundary>
    </>
  );
}
