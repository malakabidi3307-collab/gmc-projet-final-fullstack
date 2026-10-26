"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettings } from "@/lib/services";
import { PageHeader } from "./page-header";

export function SettingsView() {
  const [s, setS] = useState({ organization: "IFAG Formation", emailSessions: true, emailEnrollments: true, weeklyReport: false });
  const [msg, setMsg] = useState<string | null>(null);
  const toggle = (k: "emailSessions" | "emailEnrollments" | "weeklyReport", label: string) => (
    <Label htmlFor={k} className="font-normal"><Checkbox id={k} checked={s[k]} onCheckedChange={(c) => setS({ ...s, [k]: c === true })} />{label}</Label>
  );
  return (
    <>
      <PageHeader title="Paramètres" description="Configuration de la plateforme." />
      <Card className="max-w-xl">
        <CardHeader><CardTitle>Général et notifications</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5"><Label htmlFor="org">Nom de l’organisme</Label><Input id="org" className="h-10" value={s.organization} onChange={(e) => setS({ ...s, organization: e.target.value })} /></div>
          {toggle("emailSessions", "E-mail lors d’un changement de session")}{toggle("emailEnrollments", "E-mail pour chaque nouvelle inscription")}{toggle("weeklyReport", "Rapport hebdomadaire")}
          {msg && <p role="status" className="text-sm text-success">{msg}</p>}
          <div><Button onClick={async () => { await saveSettings(s); setMsg("Paramètres enregistrés."); }}>Enregistrer</Button></div>
        </CardContent>
      </Card>
    </>
  );
}
