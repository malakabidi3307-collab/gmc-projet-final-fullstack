"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useResource } from "@/hooks/use-resource";
import { appUsers } from "@/lib/services";
import { ConfirmDialog } from "./confirm-dialog";
import { PageHeader } from "./page-header";
import { PersonCell } from "./person-cell";
import { DataBoundary } from "./state-views";
import type { AppUser, Role } from "@/types";

const ROLES: Record<Role, string> = { admin: "Administrateur", trainer: "Formateur", learner: "Apprenant" };

export function UsersView() {
  const { data, loading, error, reload, update } = useResource(appUsers);
  const [pending, setPending] = useState<{ user: AppUser; role: Role } | null>(null);
  return (
    <>
      <PageHeader title="Utilisateurs et rôles" description="Attribuez un rôle à chaque compte." />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Rôle</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell><PersonCell name={u.name} subtitle={u.email} /></TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(r) => r && r !== u.role && setPending({ user: u, role: r as Role })}>
                      <SelectTrigger aria-label={`Rôle de ${u.name}`} className="h-9 w-44"><SelectValue>{ROLES[u.role]}</SelectValue></SelectTrigger>
                      <SelectContent>{Object.entries(ROLES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataBoundary>
      <ConfirmDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)} confirmLabel="Modifier le rôle"
        title="Modifier ce rôle ?" description={pending ? `${pending.user.name} passera de « ${ROLES[pending.user.role]} » à « ${ROLES[pending.role]} ». Ses accès changeront immédiatement.` : ""}
        onConfirm={() => pending && update(pending.user.id, { role: pending.role })} />
    </>
  );
}
