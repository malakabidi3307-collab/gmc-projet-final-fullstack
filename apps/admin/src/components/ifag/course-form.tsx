"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useResource } from "@/hooks/use-resource";
import { courses, trainers as trainersRes } from "@/lib/services";

type Errors = Partial<Record<"name" | "category" | "hours" | "modules", string>>;
const STATUSES: Record<string, string> = { draft: "Brouillon", published: "PubliÃ©e" };

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>{children}
      {error && <p id={`${id}-err`} className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function CourseForm() {
  const { data: demoTrainers } = useResource(trainersRes);
  const [v, setV] = useState({ name: "", description: "", category: "", objectives: "", hours: "", prerequisites: "", modules: "", trainer: "none", status: "draft" });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => { setV((s) => ({ ...s, [k]: e.target.value })); setSaved(false); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err: Errors = {};
    if (!v.name.trim()) err.name = "Le nom est obligatoire.";
    if (!v.category.trim()) err.category = "La catÃ©gorie est obligatoire.";
    if (!(Number(v.hours) > 0)) err.hours = "Indiquez une durÃ©e en heures.";
    if (v.status === "published" && !v.modules.trim()) err.modules = "Une formation publiÃ©e doit avoir au moins un module.";
    setErrors(err); setSaved(false);
    if (Object.keys(err).length) return;
    setSaving(true);
    try {
      await courses.create({ name: v.name, category: v.category, trainer: demoTrainers.find((t) => t.id === v.trainer)?.name ?? null, enrolled: 0, durationHours: Number(v.hours), status: v.status as "draft" | "published", updatedAt: new Date().toLocaleDateString("fr-FR") });
      setSaved(true);
    } catch { setErrors({ name: "L'enregistrement a Ã©chouÃ©. RÃ©essayez." }); }
    setSaving(false);
  }

  const inv = (k: keyof Errors) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined });

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Informations gÃ©nÃ©rales</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Field id="name" label="Nom de la formation" error={errors.name}><Input id="name" value={v.name} onChange={set("name")} {...inv("name")} /></Field>
          <Field id="category" label="CatÃ©gorie" error={errors.category}><Input id="category" value={v.category} onChange={set("category")} {...inv("category")} /></Field>
          <Field id="description" label="Description"><Textarea id="description" value={v.description} onChange={set("description")} /></Field>
          <Field id="trainer" label="Formateur responsable">
            <Select value={v.trainer} onValueChange={(t) => setV((s) => ({ ...s, trainer: t ?? "none" }))}>
              <SelectTrigger id="trainer" className="h-10 w-full"><SelectValue>{demoTrainers.find((t) => t.id === v.trainer)?.name ?? "Non assignÃ©"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non assignÃ©</SelectItem>
                {demoTrainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Contenu pÃ©dagogique</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Field id="hours" label="DurÃ©e (heures)" error={errors.hours}><Input id="hours" type="number" min={1} value={v.hours} onChange={set("hours")} {...inv("hours")} /></Field>
          <Field id="objectives" label="Objectifs pÃ©dagogiques"><Textarea id="objectives" value={v.objectives} onChange={set("objectives")} /></Field>
          <Field id="prerequisites" label="PrÃ©requis"><Input id="prerequisites" value={v.prerequisites} onChange={set("prerequisites")} /></Field>
          <Field id="modules" label="Modules du programme (un par ligne)" error={errors.modules}><Textarea id="modules" value={v.modules} onChange={set("modules")} {...inv("modules")} /></Field>
          <Field id="status" label="Statut de publication">
            <Select value={v.status} onValueChange={(s) => setV((x) => ({ ...x, status: s ?? "draft" }))}>
              <SelectTrigger id="status" className="h-10 w-full"><SelectValue>{STATUSES[v.status]}</SelectValue></SelectTrigger>
              <SelectContent>{Object.entries(STATUSES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-end gap-3 lg:col-span-2">
        {saved && <p role="status" className="mr-auto text-sm text-success">Formation enregistrÃ©e.</p>}
        <Button variant="outline" nativeButton={false} render={<Link href="/formations" />}>Annuler</Button>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}{saving ? "Enregistrementâ€¦" : "Enregistrer"}</Button>
      </div>
    </form>
  );
}
