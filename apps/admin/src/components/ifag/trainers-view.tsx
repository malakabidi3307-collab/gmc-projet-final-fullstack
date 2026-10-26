"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trainers } from "@/lib/services";
import { DataBoundary } from "./state-views";
import { useResource } from "@/hooks/use-resource";

import { DemoNotice, PageHeader } from "./page-header";
import { PersonCell } from "./person-cell";

export function TrainersView() {
  const [q, setQ] = useState("");
  const { data, loading, error, reload } = useResource(trainers);
  const list = data.filter((t) => `${t.name} ${t.specialty}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Formateurs" description="Profils, formations et sessions associÃ©es." actions={<DemoNotice />} />
      <Input aria-label="Rechercher un formateur" placeholder="Rechercher par nom ou spÃ©cialitÃ©" className="mb-4 h-10 max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
      {list.length === 0 ? (
        <p className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Aucun formateur ne correspond Ã  votre recherche.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <Card key={t.id}>
              <CardHeader><PersonCell name={t.name} subtitle={t.email} /></CardHeader>
              <CardContent className="grid gap-1 text-sm">
                <p className="text-muted-foreground">{t.specialty}</p>
                <p>{t.courses} formation(s) Â· {t.sessions} session(s)</p>
              </CardContent>
              <CardFooter><Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/formateurs/${t.id}`} />}>Voir le profil</Button></CardFooter>
            </Card>
          ))}
        </div>
      )}
      </DataBoundary>
    </>
  );
}
