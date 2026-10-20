"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsync, useResource } from "@/hooks/use-resource";
import { getDashboard, learnerCourses } from "@/lib/services";
import { DashboardStats } from "./dashboard-stats";
import { EnrollmentChart } from "./enrollment-chart";
import { PageHeader } from "./page-header";
import { useCurrentUser } from "./role-context";
import { DataBoundary } from "./state-views";

const ALERT = { warning: ["Attention", "bg-warning-soft text-warning"], danger: ["Urgent", "bg-danger-soft text-destructive"], info: ["Info", "bg-success-soft text-success"] } as const;

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-sm"><strong>{label}</strong><span>{value} %</span></div>
      <div role="progressbar" aria-label={`Progression ${label}`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-2.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export function DashboardView() {
  const { user } = useCurrentUser();
  const dash = useAsync(() => getDashboard(user.role), [user.role]);
  const mine = useResource(learnerCourses);
  const d = dash.data;
  const title = user.role === "admin" ? "Bonjour, bienvenue sur votre tableau de bord" : `Bonjour ${user.name}`;
  return (
    <div className="grid gap-4">
      <PageHeader title={title} description={user.role === "admin" ? "Période de référence : septembre 2026" : user.role === "trainer" ? "Espace formateur" : "Votre espace d’apprentissage"} />
      <DataBoundary loading={dash.loading} error={dash.error} onRetry={dash.reload}>
        {d && (
          <>
            <DashboardStats stats={d.stats} />
            <div className="grid gap-4 lg:grid-cols-3">
              {user.role === "admin" && (
                <Card className="lg:col-span-2"><CardHeader><CardTitle>Inscriptions par mois</CardTitle></CardHeader><CardContent><EnrollmentChart values={d.enrollments} labels={d.months} /></CardContent></Card>
              )}
              {user.role === "learner" && (
                <Card className="lg:col-span-2"><CardHeader><CardTitle>Ma progression</CardTitle></CardHeader><CardContent>{mine.data.map((c) => <Progress key={c.id} label={c.name} value={c.progress} />)}</CardContent></Card>
              )}
              <Card className={user.role === "trainer" ? "lg:col-span-3" : ""}>
                <CardHeader><CardTitle>{user.role === "learner" ? "Annonces" : "À traiter"}</CardTitle></CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  {d.alerts.map((a) => <p key={a.id}><Badge variant="secondary" className={`mr-2 border-0 ${ALERT[a.tone][1]}`}>{ALERT[a.tone][0]}</Badge>{a.text}</p>)}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle>{user.role === "admin" ? "Prochaines sessions" : "Mes prochaines sessions"}</CardTitle></CardHeader>
              <CardContent className="divide-y text-sm">
                {d.sessions.length === 0 && <p className="text-muted-foreground">Aucune session à venir.</p>}
                {d.sessions.map((s) => (
                  <div key={s.id} className="grid gap-1 py-3 sm:grid-cols-4">
                    <strong>{s.course}</strong><span>{s.trainer ?? "Non assigné"}</span><span>{s.startsAt} · {s.location}</span><span>{s.enrolled} / {s.capacity} inscrits</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </DataBoundary>
    </div>
  );
}
