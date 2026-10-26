"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import type { Course, CourseStatus } from "@/types";

const PAGE_SIZE = 5;
const STATUS_LABELS: Record<string, string> = { all: "Tous les statuts", published: "Publiée", draft: "Brouillon", archived: "Archivée" };

export function CourseTable({ courses, onArchive }: { courses: Course[]; onArchive: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () => courses.filter((c) => (status === "all" || c.status === (status as CourseStatus)) && c.name.toLowerCase().includes(q.toLowerCase())),
    [courses, q, status],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        <Input aria-label="Rechercher une formation" placeholder="Rechercher une formation" className="h-10 max-w-sm" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <Select value={status} onValueChange={(v) => { setStatus(v ?? "all"); setPage(0); }}>
          <SelectTrigger aria-label="Filtrer par statut" className="h-10 w-48"><SelectValue>{STATUS_LABELS[status]}</SelectValue></SelectTrigger>
          <SelectContent>{Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Formation</TableHead><TableHead>Catégorie</TableHead><TableHead>Responsable</TableHead>
              <TableHead>Inscrits</TableHead><TableHead>Durée</TableHead><TableHead>Statut</TableHead>
              <TableHead>Mise à jour</TableHead><TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Aucun résultat. Modifiez votre recherche ou vos filtres.</TableCell></TableRow>
            ) : rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>{c.trainer ?? <span className="text-muted-foreground">Non assigné</span>}</TableCell>
                <TableCell>{c.enrolled}</TableCell>
                <TableCell>{c.durationHours} h</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell>{c.updatedAt}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions pour ${c.name}`} />}><MoreHorizontal /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Consulter</DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => onArchive(c.id)}>Archiver</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtered.length} formation(s) · page {page + 1} / {pages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
          <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
        </div>
      </div>
    </div>
  );
}
