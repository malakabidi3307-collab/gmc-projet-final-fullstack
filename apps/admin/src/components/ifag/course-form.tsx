"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-resource";
import { courses } from "@/lib/services";
import { listTrainerOptions } from "@/lib/trainer-options";
import type { Course, CourseStatus } from "@/types";

type Errors = Partial<Record<"name" | "category" | "hours" | "modules", string>>;
const STATUSES: Record<string, string> = { draft: "Brouillon", published: "Publiée", archived: "Archivée" };
const MAX_TEXT = 5000;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>{children}
      {error && <p id={`${id}-err`} className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function CourseForm({ course }: { course?: Course } = {}) {
  const router = useRouter();
  const trainersState = useAsync(listTrainerOptions, []);
  const listed = trainersState.data ?? [];
  // Un formateur desactive depuis reste affiche (et conserve) tant qu'on ne change pas la selection.
  const trainerOptions = course?.trainerId && !listed.some((t) => t.id === course.trainerId)
    ? [{ id: course.trainerId, name: course.trainer ?? "Formateur actuel" }, ...listed]
    : listed;
  const [v, setV] = useState({ name: course?.name ?? "", description: course?.description ?? "", category: course?.category ?? "", objectives: course?.objectives ?? "", hours: course ? String(course.durationHours) : "", prerequisites: course?.prerequisites ?? "", modules: course?.modules ?? "", trainer: course?.trainerId ?? "none", status: (course?.status ?? "draft") as string });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => { setV((s) => ({ ...s, [k]: e.target.value })); setFormError(null); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err: Errors = {};
    const hours = Number(v.hours);
    if (v.name.trim().length < 2) err.name = "Le nom est obligatoire (2 caractères minimum).";
    if (v.category.trim().length < 2) err.category = "La catégorie est obligatoire (2 caractères minimum).";
    if (!Number.isInteger(hours) || hours < 1 || hours > 2000) err.hours = "Indiquez une durée entière en heures (1 à 2000).";
    if (v.status === "published" && !v.modules.trim()) err.modules = "Une formation publiée doit avoir au moins un module.";
    setErrors(err); setFormError(null);
    if (Object.keys(err).length) return;
    setSaving(true);
    try {
      const payload: Omit<Course, "id"> = ({
        name: v.name,
        category: v.category,
        description: v.description,
        objectives: v.objectives,
        prerequisites: v.prerequisites,
        modules: v.modules,
        trainer: trainerOptions.find((t) => t.id === v.trainer)?.name ?? null,
        trainerId: v.trainer === "none" ? null : v.trainer,
        enrolled: 0,
        durationHours: hours,
        status: v.status as CourseStatus,
        updatedAt: "",
      });
      if (course) await courses.update(course.id, payload); else await courses.create(payload);
      router.push(course ? `/formations/${course.id}` : "/formations");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "L'enregistrement a échoué. Réessayez.");
      setSaving(false);
    }
  }

  const inv = (k: keyof Errors) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined });
  const trainerLabel = trainersState.loading
    ? "Chargement…"
    : (trainerOptions.find((t) => t.id === v.trainer)?.name ?? "Non assigné");

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 lg:grid-cols-2">
      {formError && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-destructive lg:col-span-2">{formError}</p>}
      <Card>
        <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Field id="name" label="Nom de la formation" error={errors.name}><Input id="name" value={v.name} onChange={set("name")} maxLength={150} {...inv("name")} /></Field>
          <Field id="category" label="Catégorie" error={errors.category}><Input id="category" value={v.category} onChange={set("category")} maxLength={80} {...inv("category")} /></Field>
          <Field id="description" label="Description"><Textarea id="description" value={v.description} onChange={set("description")} maxLength={MAX_TEXT} /></Field>
          <Field id="trainer" label="Formateur responsable">
            <Select value={v.trainer} onValueChange={(t) => setV((s) => ({ ...s, trainer: t ?? "none" }))} disabled={trainersState.loading}>
              <SelectTrigger id="trainer" className="h-10 w-full"><SelectValue>{trainerLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non assigné</SelectItem>
                {trainerOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {trainersState.error && (
              <p className="text-sm text-destructive">
                Impossible de charger les formateurs.{" "}
                <button type="button" className="underline underline-offset-4" onClick={trainersState.reload}>Réessayer</button>
              </p>
            )}
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Contenu pédagogique</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Field id="hours" label="Durée (heures)" error={errors.hours}><Input id="hours" type="number" min={1} max={2000} value={v.hours} onChange={set("hours")} {...inv("hours")} /></Field>
          <Field id="objectives" label="Objectifs pédagogiques"><Textarea id="objectives" value={v.objectives} onChange={set("objectives")} maxLength={MAX_TEXT} /></Field>
          <Field id="prerequisites" label="Prérequis"><Input id="prerequisites" value={v.prerequisites} onChange={set("prerequisites")} maxLength={MAX_TEXT} /></Field>
          <Field id="modules" label="Modules du programme (un par ligne)" error={errors.modules}><Textarea id="modules" value={v.modules} onChange={set("modules")} maxLength={MAX_TEXT} {...inv("modules")} /></Field>
          <Field id="status" label="Statut de publication">
            <Select value={v.status} onValueChange={(s) => setV((x) => ({ ...x, status: s ?? "draft" }))}>
              <SelectTrigger id="status" className="h-10 w-full"><SelectValue>{STATUSES[v.status]}</SelectValue></SelectTrigger>
              <SelectContent>{Object.entries(STATUSES).filter(([k]) => course || k !== "archived").map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-end gap-3 lg:col-span-2">
        <Button variant="outline" nativeButton={false} render={<Link href="/formations" />}>Annuler</Button>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}{saving ? "Enregistrement…" : "Enregistrer"}</Button>
      </div>
    </form>
  );
}