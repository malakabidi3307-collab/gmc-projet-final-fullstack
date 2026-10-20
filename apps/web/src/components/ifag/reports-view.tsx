"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsync, useResource } from "@/hooks/use-resource";
import { attendanceRates, getDashboard } from "@/lib/services";
import { DashboardStats } from "./dashboard-stats";
import { EnrollmentChart } from "./enrollment-chart";
import { PageHeader } from "./page-header";
import { DataBoundary } from "./state-views";

export function ReportsView() {
  const d = useAsync(() => getDashboard("admin"), []);
  const r = useResource(attendanceRates);
  return (
    <>
      <PageHeader title="Rapports et statistiques" description="Indicateurs de pilotage." />
      <DataBoundary loading={d.loading || r.loading} error={d.error ?? r.error} onRetry={() => { d.reload(); r.reload(); }}>
        {d.data && (
          <div className="grid gap-4">
            <DashboardStats stats={d.data.stats} />
            <Card><CardHeader><CardTitle>Inscriptions par mois</CardTitle></CardHeader><CardContent><EnrollmentChart values={d.data.enrollments} labels={d.data.months} /></CardContent></Card>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader><TableRow><TableHead>Formation</TableHead><TableHead>Inscrits</TableHead><TableHead>Taux de présence</TableHead></TableRow></TableHeader>
                <TableBody>{r.data.map((x) => <TableRow key={x.id}><TableCell className="font-medium">{x.course}</TableCell><TableCell>{x.enrolled}</TableCell><TableCell>{x.rate} %</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </div>
        )}
      </DataBoundary>
    </>
  );
}
