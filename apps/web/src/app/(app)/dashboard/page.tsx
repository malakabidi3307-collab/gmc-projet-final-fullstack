import { DashboardStats } from "@/components/ifag/dashboard-stats";
import { EnrollmentChart } from "@/components/ifag/enrollment-chart";
import { DemoNotice, PageHeader } from "@/components/ifag/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoAlerts, demoEnrollmentMonths, demoEnrollments, demoSessions, demoStats } from "@/data/demo";

const ALERT = { warning: ["Attention", "bg-warning-soft text-warning"], danger: ["Urgent", "bg-danger-soft text-destructive"], info: ["Info", "bg-success-soft text-success"] } as const;

export default function DashboardPage() {
  return (
    <div className="grid gap-4">
      <PageHeader title="Bonjour, bienvenue sur votre tableau de bord" description="Période de référence : septembre 2026" actions={<DemoNotice />} />
      <DashboardStats stats={demoStats} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Inscriptions par mois</CardTitle></CardHeader>
          <CardContent><EnrollmentChart values={demoEnrollments} labels={demoEnrollmentMonths} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>À traiter</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {demoAlerts.map((a) => (
              <p key={a.id}><Badge variant="secondary" className={`mr-2 border-0 ${ALERT[a.tone][1]}`}>{ALERT[a.tone][0]}</Badge>{a.text}</p>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Prochaines sessions</CardTitle></CardHeader>
        <CardContent className="divide-y text-sm">
          {demoSessions.map((s) => (
            <div key={s.id} className="grid gap-1 py-3 sm:grid-cols-4">
              <strong>{s.course}</strong><span>{s.trainer ?? "Non assigné"}</span><span>{s.startsAt} · {s.location}</span><span>{s.enrolled} / {s.capacity} inscrits</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
