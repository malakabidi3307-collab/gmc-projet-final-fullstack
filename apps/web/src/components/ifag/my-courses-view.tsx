"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/use-resource";
import { courses, learnerCourses } from "@/lib/services";
import { CoursesView } from "./courses-view";
import { PageHeader } from "./page-header";
import { useCurrentUser } from "./role-context";
import { DataBoundary, EmptyState } from "./state-views";
import { StatusBadge } from "./status-badge";

function Bar({ value, label }: { value: number; label: string }) {
  return <div role="progressbar" aria-label={`Progression ${label}`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-2.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} /></div>;
}

// /formations : catalogue complet pour l'admin, « Mes formations » pour formateur et apprenant.
export function FormationsPage() {
  const { user } = useCurrentUser();
  return user.role === "admin" ? <CoursesView /> : <MyCoursesView />;
}

export function MyCoursesView() {
  const { user } = useCurrentUser();
  const cs = useResource(courses); const lc = useResource(learnerCourses);
  const trainerCourses = cs.data.filter((c) => c.trainer === user.name);
  return (
    <>
      <PageHeader title="Mes formations" description={user.role === "trainer" ? "Formations dont vous êtes responsable." : "Formations auxquelles vous êtes inscrit(e)."} />
      <DataBoundary loading={cs.loading || lc.loading} error={cs.error ?? lc.error} onRetry={() => { cs.reload(); lc.reload(); }}>
        {(user.role === "trainer" ? trainerCourses.length : lc.data.length) === 0 ? <EmptyState title="Aucune formation" /> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {user.role === "trainer" ? trainerCourses.map((c) => (
              <Card key={c.id}><CardHeader><CardTitle>{c.name}</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm"><p>{c.category} · {c.durationHours} h</p><p>{c.enrolled} inscrit(s)</p><div><StatusBadge status={c.status} /></div></CardContent></Card>
            )) : lc.data.map((c) => (
              <Card key={c.id}><CardHeader><CardTitle>{c.name}</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm"><p>Formateur : {c.trainer}</p><Bar value={c.progress} label={c.name} /><p>{c.progress} % · Prochaine session : {c.nextSession ?? "—"}</p></CardContent></Card>
            ))}
          </div>
        )}
      </DataBoundary>
    </>
  );
}

export function ProgressView() {
  const lc = useResource(learnerCourses);
  return (
    <>
      <PageHeader title="Ma progression" description="Avancement dans chacune de vos formations." />
      <DataBoundary loading={lc.loading} error={lc.error} onRetry={lc.reload}>
        <Card><CardContent className="grid gap-6 pt-6">
          {lc.data.map((c) => <div key={c.id}><div className="mb-1 flex justify-between text-sm"><strong>{c.name}</strong><span>{c.progress} %</span></div><Bar value={c.progress} label={c.name} /></div>)}
        </CardContent></Card>
      </DataBoundary>
    </>
  );
}
