"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsync, useResource } from "@/hooks/use-resource";
import { courses, enrollments, sessions, students, trainers } from "@/lib/services";
import { PageHeader } from "./page-header";
import { PersonCell } from "./person-cell";
import { DataBoundary, EmptyState } from "./state-views";
import { StatusBadge } from "./status-badge";
import { ToneBadge } from "./tone-badge";

const Info = ({ label, children }: { label: string; children: ReactNode }) => (
  <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="text-sm font-medium">{children}</dd></div>
);
const Back = ({ href, label }: { href: string; label: string }) => <Button variant="outline" nativeButton={false} render={<Link href={href} />}>{label}</Button>;

export function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: c, loading, error, reload } = useAsync(() => courses.get(id), [id]);
  return (
    <>
      <PageHeader title={c?.name ?? "Formation"} description="DÃ©tail de la formation" actions={<Back href="/formations" label="Retour aux formations" />} />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
        {!c ? <EmptyState title="Formation introuvable" /> : (
          <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
            <dl className="contents">
              <Info label="CatÃ©gorie">{c.category}</Info><Info label="Responsable">{c.trainer ?? "Non assignÃ©"}</Info>
              <Info label="Statut"><StatusBadge status={c.status} /></Info><Info label="Inscrits">{c.enrolled}</Info>
              <Info label="DurÃ©e">{c.durationHours} h</Info><Info label="Mise Ã  jour">{c.updatedAt}</Info>
            </dl>
          </CardContent></Card>
        )}
      </DataBoundary>
    </>
  );
}

export function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const s = useAsync(() => students.get(id), [id]);
  const en = useResource(enrollments);
  const mine = en.data.filter((e) => e.student === s.data?.name);
  return (
    <>
      <PageHeader title={s.data?.name ?? "Apprenant"} description="Profil de lâ€™apprenant" actions={<Back href="/apprenants" label="Retour aux apprenants" />} />
      <DataBoundary loading={s.loading || en.loading} error={s.error ?? en.error} onRetry={() => { s.reload(); en.reload(); }}>
        {!s.data ? <EmptyState title="Apprenant introuvable" /> : (
          <div className="grid gap-4">
            <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-3"><PersonCell name={s.data.name} subtitle={s.data.email} /><Info label="Inscrit le">{s.data.joinedAt}</Info><Info label="Formations">{s.data.courses}</Info></CardContent></Card>
            <Card><CardHeader><CardTitle>Formations suivies</CardTitle></CardHeader><CardContent className="divide-y text-sm">
              {mine.length === 0 && <p className="text-muted-foreground">Aucune inscription.</p>}
              {mine.map((e) => <p key={e.id} className="flex justify-between py-2"><span>{e.course}</span><ToneBadge tone={e.status === "confirmed" ? "success" : e.status === "pending" ? "warning" : "neutral"}>{e.status === "confirmed" ? "ConfirmÃ©e" : e.status === "pending" ? "En attente" : "AnnulÃ©e"}</ToneBadge></p>)}
            </CardContent></Card>
            {/* TODO(API): GET /api/students/:id/attendance et /api/students/:id/results */}
            <EmptyState title="Historique de prÃ©sence et rÃ©sultats" description="Ces donnÃ©es apparaÃ®tront une fois les routes /api/students/:id/attendance et /results disponibles." />
          </div>
        )}
      </DataBoundary>
    </>
  );
}

export function TrainerDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useAsync(() => trainers.get(id), [id]);
  const cs = useResource(courses); const ss = useResource(sessions);
  const name = t.data?.name;
  return (
    <>
      <PageHeader title={name ?? "Formateur"} description="Profil du formateur" actions={<Back href="/formateurs" label="Retour aux formateurs" />} />
      <DataBoundary loading={t.loading || cs.loading || ss.loading} error={t.error ?? cs.error ?? ss.error} onRetry={() => { t.reload(); cs.reload(); ss.reload(); }}>
        {!t.data ? <EmptyState title="Formateur introuvable" /> : (
          <div className="grid gap-4">
            <Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-3"><PersonCell name={t.data.name} subtitle={t.data.email} /><Info label="SpÃ©cialitÃ©">{t.data.specialty}</Info><Info label="ActivitÃ©">{t.data.courses} formation(s) Â· {t.data.sessions} session(s)</Info></CardContent></Card>
            <Card><CardHeader><CardTitle>Formations</CardTitle></CardHeader><CardContent className="divide-y text-sm">
              {cs.data.filter((c) => c.trainer === name).map((c) => <p key={c.id} className="flex justify-between py-2"><span>{c.name}</span><StatusBadge status={c.status} /></p>)}
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Sessions</CardTitle></CardHeader><CardContent className="divide-y text-sm">
              {ss.data.filter((s) => s.trainer === name).map((s) => <p key={s.id} className="py-2">{s.course} Â· {s.start} â†’ {s.end} Â· {s.location}</p>)}
            </CardContent></Card>
          </div>
        )}
      </DataBoundary>
    </>
  );
}
