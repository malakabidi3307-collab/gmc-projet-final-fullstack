"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { enrollments } from "@/lib/services";
import { DataBoundary } from "./state-views";
import { useResource } from "@/hooks/use-resource";

import { ConfirmDialog } from "./confirm-dialog";
import { DemoNotice, PageHeader } from "./page-header";
import { PersonCell } from "./person-cell";
import { PAGE_SIZE, TablePager } from "./table-pager";
import { ToneBadge, type Tone } from "./tone-badge";
import type { Enrollment, EnrollmentStatus } from "@/types";

const STATUS: Record<EnrollmentStatus, { label: string; tone: Tone }> = {
  confirmed: { label: "Confirmée", tone: "success" }, pending: { label: "En attente", tone: "warning" }, cancelled: { label: "Annulée", tone: "neutral" },
};
const FILTER: Record<string, string> = { all: "Tous les statuts", pending: "En attente", confirmed: "Confirmée", cancelled: "Annulée" };

export function EnrollmentsView() {
  const { data: items, loading, error, reload, update } = useResource(enrollments);
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all"); const [page, setPage] = useState(0);
  const [target, setTarget] = useState<Enrollment | null>(null);
  const filtered = useMemo(() => items.filter((i) => (status === "all" || i.status === status) && `${i.student} ${i.course}`.toLowerCase().includes(q.toLowerCase())), [items, q, status]);
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const setStatusOf = (id: string, s: EnrollmentStatus) => update(id, { status: s });

  return (
    <>
      <PageHeader title="Inscriptions" description="Validez ou annulez les demandes d’inscription." actions={<DemoNotice />} />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input aria-label="Rechercher une inscription" placeholder="Rechercher un apprenant ou une formation" className="h-10 max-w-sm" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <Select value={status} onValueChange={(v) => { setStatus(v ?? "all"); setPage(0); }}>
          <SelectTrigger aria-label="Filtrer par statut" className="h-10 w-48"><SelectValue>{FILTER[status]}</SelectValue></SelectTrigger>
          <SelectContent>{Object.entries(FILTER).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Apprenant</TableHead><TableHead>Formation</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Aucune inscription ne correspond à votre recherche.</TableCell></TableRow>
              : rows.map((i) => (
                <TableRow key={i.id}>
                  <TableCell><PersonCell name={i.student} /></TableCell><TableCell>{i.course}</TableCell><TableCell>{i.date}</TableCell>
                  <TableCell><ToneBadge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</ToneBadge></TableCell>
                  <TableCell className="text-right">
                    {i.status === "pending" && <Button size="sm" className="mr-2" onClick={() => setStatusOf(i.id, "confirmed")}>Confirmer</Button>}
                    {i.status !== "cancelled" && <Button size="sm" variant="outline" onClick={() => setTarget(i)}>Annuler</Button>}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4"><TablePager total={filtered.length} page={page} onPage={setPage} label="inscription(s)" /></div>
      </DataBoundary>
      <ConfirmDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)} confirmLabel="Annuler l’inscription"
        title="Annuler cette inscription ?" description={`${target?.student ?? ""} ne sera plus inscrit(e) à « ${target?.course ?? ""} ».`}
        onConfirm={() => target && setStatusOf(target.id, "cancelled")} />
    </>
  );
}
