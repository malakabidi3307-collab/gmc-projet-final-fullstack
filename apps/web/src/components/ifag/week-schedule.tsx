"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { schedule } from "@/lib/services";
import { useCurrentUser } from "./role-context";
import { DataBoundary } from "./state-views";
import { useResource } from "@/hooks/use-resource";

import { DemoNotice, PageHeader } from "./page-header";

// Lundi de la semaine affichée en premier. TODO(API) : calculer la semaine courante et passer from/to à l'API.
const SCHEDULE_BASE = "2026-10-12";
const DAYS = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven."];
const FIRST = 8, LAST = 18, ROW = 56; // heures affichées et hauteur de ligne (px)
const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d; };

export function WeekSchedule() {
  const [week, setWeek] = useState(0);
  const [trainer, setTrainer] = useState("all");
  const { user } = useCurrentUser();
  const { data, loading, error, reload } = useResource(schedule);
  const trainers = useMemo(() => [...new Set(data.map((e) => e.trainer))], [data]);
  // Formateurs et apprenants ne voient que leurs sessions (filtrage à faire côté API) ; le filtre n'est proposé qu'à l'admin.
  const events = data.filter((e) => e.week === week && (trainer === "all" || e.trainer === trainer));
  const start = addDays(SCHEDULE_BASE, week * 7), end = addDays(SCHEDULE_BASE, week * 7 + 4);
  const hours = Array.from({ length: LAST - FIRST }, (_, i) => FIRST + i);

  return (
    <>
      <PageHeader
        title="Emploi du temps"
        description={`Semaine du ${fmt.format(start)} au ${fmt.format(end)} 2026`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {user.role === "admin" && (
              <Select value={trainer} onValueChange={(v) => setTrainer(v ?? "all")}>
                <SelectTrigger aria-label="Filtrer par formateur" className="h-10 w-48"><SelectValue>{trainer === "all" ? "Tous les formateurs" : trainer}</SelectValue></SelectTrigger>
                <SelectContent><SelectItem value="all">Tous les formateurs</SelectItem>{trainers.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Button variant="outline" size="icon" aria-label="Semaine précédente" disabled={week === 0} onClick={() => setWeek((w) => w - 1)}><ChevronLeft /></Button>
            <Button variant="outline" size="icon" aria-label="Semaine suivante" disabled={week === 1} onClick={() => setWeek((w) => w + 1)}><ChevronRight /></Button>
          </div>
        }
      />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[4rem_repeat(5,1fr)] border-b text-sm font-semibold">
            <span />{DAYS.map((d, i) => <span key={d} className="border-l p-3">{d} {addDays(SCHEDULE_BASE, week * 7 + i).getUTCDate()}</span>)}
          </div>
          <div className="relative grid grid-cols-[4rem_repeat(5,1fr)]" style={{ gridTemplateRows: `repeat(${hours.length}, ${ROW}px)` }}>
            {hours.map((h, i) => (
              <div key={h} className="contents">
                <span className="border-b p-2 text-xs text-muted-foreground" style={{ gridRow: i + 1, gridColumn: 1 }}>{String(h).padStart(2, "0")}:00</span>
                {DAYS.map((d, c) => <span key={d} className="border-b border-l" style={{ gridRow: i + 1, gridColumn: c + 2 }} />)}
              </div>
            ))}
            {events.map((e) => (
              <article key={e.id} className="z-10 m-1 overflow-hidden rounded-lg bg-secondary p-2 text-xs text-secondary-foreground"
                style={{ gridColumn: e.day + 2, gridRow: `${e.startHour - FIRST + 1} / ${e.endHour - FIRST + 1}` }}>
                <p className="font-semibold">{e.course}</p>
                <p>{String(e.startHour).padStart(2, "0")}:00–{String(e.endHour).padStart(2, "0")}:00 · {e.location}</p>
                <p>{e.trainer}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
      </DataBoundary>
      {!loading && events.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Aucune session programmée cette semaine pour ce filtre.</p>}
      <div className="mt-4"><DemoNotice /></div>
    </>
  );
}
