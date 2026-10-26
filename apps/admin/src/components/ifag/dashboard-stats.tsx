import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Stat } from "@/types";

const TONE = { positive: "text-success", negative: "text-warning", neutral: "text-muted-foreground" };

export function DashboardStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{s.value}</p>
            {s.trend && <p className={cn("mt-1 text-sm", TONE[s.tone ?? "neutral"])}>{s.trend}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
