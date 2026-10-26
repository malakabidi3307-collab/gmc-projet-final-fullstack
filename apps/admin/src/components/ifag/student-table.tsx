"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "./confirm-dialog";
import { PersonCell } from "./person-cell";
import { PAGE_SIZE, TablePager } from "./table-pager";
import { ToneBadge, type Tone } from "./tone-badge";
import type { AccountStatus, Student } from "@/types";

const STATUS: Record<AccountStatus, { label: string; tone: Tone }> = {
  active: { label: "Actif", tone: "success" },
  pending: { label: "En attente", tone: "warning" },
  disabled: { label: "Désactivé", tone: "neutral" },
};
const FILTER: Record<string, string> = { all: "Tous les statuts", active: "Actif", pending: "En attente", disabled: "Désactivé" };

export function StudentTable({ students, onDisable }: { students: Student[]; onDisable: (id: string) => void }) {
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all"); const [page, setPage] = useState(0);
  const [target, setTarget] = useState<Student | null>(null);
  const filtered = useMemo(
    () => students.filter((s) => (status === "all" || s.status === status) && `${s.name} ${s.email}`.toLowerCase().includes(q.toLowerCase())),
    [students, q, status],
  );
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        <Input aria-label="Rechercher un apprenant" placeholder="Rechercher par nom ou e-mail" className="h-10 max-w-sm" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <Select value={status} onValueChange={(v) => { setStatus(v ?? "all"); setPage(0); }}>
          <SelectTrigger aria-label="Filtrer par statut" className="h-10 w-48"><SelectValue>{FILTER[status]}</SelectValue></SelectTrigger>
          <SelectContent>{Object.entries(FILTER).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Apprenant</TableHead><TableHead>Formations</TableHead><TableHead>Statut</TableHead><TableHead>Inscrit le</TableHead>
            <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Aucun apprenant ne correspond à votre recherche.</TableCell></TableRow>
            ) : rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell><PersonCell name={s.name} subtitle={s.email} /></TableCell>
                <TableCell>{s.courses}</TableCell>
                <TableCell><ToneBadge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</ToneBadge></TableCell>
                <TableCell>{s.joinedAt}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions pour ${s.name}`} />}><MoreHorizontal /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Consulter</DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      {s.status !== "disabled" && <DropdownMenuItem variant="destructive" onClick={() => setTarget(s)}>Désactiver</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePager total={filtered.length} page={page} onPage={setPage} label="apprenant(s)" />
      <ConfirmDialog
        open={!!target} onOpenChange={(o) => !o && setTarget(null)} confirmLabel="Désactiver le compte"
        title={`Désactiver ${target?.name ?? ""} ?`} description="L'apprenant ne pourra plus se connecter. Vous pourrez réactiver le compte plus tard."
        onConfirm={() => target && onDisable(target.id)}
      />
    </div>
  );
}
