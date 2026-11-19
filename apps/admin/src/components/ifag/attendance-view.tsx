"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAsync, useResource } from "@/hooks/use-resource";
import { getAttendance, saveAttendance, sessions } from "@/lib/services";
import { ConfirmDialog } from "./confirm-dialog";
import { PageHeader } from "./page-header";
import { PersonCell } from "./person-cell";
import { useCurrentUser } from "./role-context";
import { DataBoundary, EmptyState } from "./state-views";
import type { AttendanceRow, AttendanceStatus } from "@/types";

const OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Présent" }, { value: "late", label: "En retard" }, { value: "absent", label: "Absent" },
];

interface Rows { sid: string; rows: AttendanceRow[] }

export function AttendanceView() {
  const { user } = useCurrentUser();
  const list = useResource(sessions);
  const mine = (user.role === "trainer" ? list.data.filter((s) => s.trainer === user.name) : list.data).filter((s) => s.status !== "ended");

  // Session choisie, sinon la premiere disponible (valeur derivee, pas d'effet).
  const [chosen, setChosen] = useState("");
  const sid = mine.some((s) => s.id === chosen) ? chosen : (mine[0]?.id ?? "");

  const att = useAsync(() => (sid ? getAttendance(sid) : Promise.resolve([] as AttendanceRow[])), [sid]);
  const [savedRows, setSavedRows] = useState<Rows | null>(null);
  const [editRows, setEditRows] = useState<Rows | null>(null);
  const [doneSid, setDoneSid] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const saved = savedRows?.sid === sid ? savedRows.rows : (att.data ?? []);
  const draft = editRows?.sid === sid ? editRows.rows : saved;
  const done = doneSid === sid;

  const changes = draft.filter((d, i) => d.status !== saved[i]?.status).length;
  const present = draft.filter((d) => d.status !== "absent").length;
  const rate = useMemo(() => (draft.length ? Math.round((present / draft.length) * 100) : 0), [draft, present]);
  const current = mine.find((s) => s.id === sid);

  async function validate() {
    try {
      await saveAttendance(sid, draft);
      setSavedRows({ sid, rows: draft });
      setEditRows(null);
      setDoneSid(sid);
      setErr(null);
    } catch (e) { setErr(e instanceof Error ? e.message : "Échec de l’enregistrement"); }
  }

  return (
    <>
      <PageHeader title="Présences" description="Sélectionnez une session puis enregistrez les présences."
        actions={
          <Select value={sid} onValueChange={(v) => setChosen(v ?? "")}>
            <SelectTrigger aria-label="Session" className="h-10 w-72"><SelectValue>{current ? `${current.course} · ${current.start}` : "Choisir une session"}</SelectValue></SelectTrigger>
            <SelectContent>{mine.map((s) => <SelectItem key={s.id} value={s.id}>{s.course} · {s.start}</SelectItem>)}</SelectContent>
          </Select>
        } />
      <DataBoundary loading={list.loading || att.loading} error={list.error ?? att.error} onRetry={() => { list.reload(); att.reload(); }}>
        {!current ? <EmptyState title="Aucune session disponible" description="Aucune session en cours ou à venir pour votre compte." /> : (
          <Card>
            <CardHeader><CardTitle>Taux de présence : {rate} % <span className="text-sm font-normal text-muted-foreground">({present} sur {draft.length})</span></CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              {draft.map((row, i) => (
                <div key={row.studentId} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 first:border-0 first:pt-0">
                  <PersonCell name={row.name} />
                  <div role="group" aria-label={`Présence de ${row.name}`} className="flex gap-2">
                    {OPTIONS.map((o) => (
                      <Button key={o.value} size="sm" variant={row.status === o.value ? "default" : "outline"} aria-pressed={row.status === o.value}
                        onClick={() => { setEditRows({ sid, rows: draft.map((r, j) => (j === i ? { ...r, status: o.value } : r)) }); setDoneSid(null); }}>{o.label}</Button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
                {err && <p role="alert" className="mr-auto text-sm text-destructive">{err}</p>}
                {done && <p role="status" className="mr-auto text-sm text-success">Présences enregistrées.</p>}
                {changes > 0 && <span className="mr-auto text-sm text-warning">{changes} modification(s) non validée(s)</span>}
                <Button variant="outline" disabled={changes === 0} onClick={() => setEditRows(null)}>Annuler les modifications</Button>
                <Button disabled={changes === 0} onClick={() => setConfirm(true)}>Valider les présences</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DataBoundary>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Valider les présences ?" confirmLabel="Valider"
        description={`${changes} modification(s) seront appliquées à cette session. Vous pourrez les corriger ensuite.`} onConfirm={validate} />
    </>
  );
}