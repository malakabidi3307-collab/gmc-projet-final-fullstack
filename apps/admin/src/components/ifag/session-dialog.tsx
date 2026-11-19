"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAsync } from "@/hooks/use-resource";
import { courses } from "@/lib/services";
import { listTrainerOptions } from "@/lib/trainer-options";
import type { SessionRow } from "@/types";

type Errors = Partial<Record<"course" | "start" | "end" | "location" | "capacity", string>>;

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO -> valeur d'un champ datetime-local (heure locale du navigateur). */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>{children}
      {error && <p id={`${id}-err`} className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Monte seulement quand le dialogue est ouvert : l'etat repart donc de zero a chaque ouverture. */
export function SessionDialog({ session, onClose, onSubmit }: {
  session: SessionRow | null;
  onClose: () => void;
  onSubmit: (value: Omit<SessionRow, "id">) => Promise<void>;
}) {
  const editing = session !== null;
  const coursesState = useAsync(() => courses.list(), []);
  const trainersState = useAsync(listTrainerOptions, []);

  const courseOptions = (coursesState.data ?? []).filter((c) => c.status !== "archived");
  const listed = trainersState.data ?? [];
  // Un formateur desactive depuis reste affiche (et conserve) tant qu'on ne change pas la selection.
  const trainerOptions = session?.trainerId && !listed.some((t) => t.id === session.trainerId)
    ? [{ id: session.trainerId, name: session.trainer ?? "Formateur actuel" }, ...listed]
    : listed;

  const [v, setV] = useState({
    course: session?.courseId ?? "none",
    trainer: session?.trainerId ?? "none",
    start: toLocalInput(session?.startsAtIso),
    end: toLocalInput(session?.endsAtIso),
    location: session?.location ?? "",
    capacity: session ? String(session.capacity) : "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => { setV((s) => ({ ...s, [k]: e.target.value })); setFormError(null); };

  const courseName = editing ? session.course : (courseOptions.find((c) => c.id === v.course)?.name ?? "");
  const courseLabel = editing ? session.course : coursesState.loading ? "Chargement…" : (courseName || "Choisir une formation");
  const trainerLabel = trainersState.loading ? "Chargement…" : (trainerOptions.find((t) => t.id === v.trainer)?.name ?? "Non assigné");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err: Errors = {};
    const capacity = Number(v.capacity);
    const start = new Date(v.start);
    const end = new Date(v.end);
    if (!editing && v.course === "none") err.course = "Choisissez une formation.";
    if (!v.start || Number.isNaN(start.getTime())) err.start = "Indiquez la date et l'heure de début.";
    if (!v.end || Number.isNaN(end.getTime())) err.end = "Indiquez la date et l'heure de fin.";
    if (!err.start && !err.end && end.getTime() <= start.getTime()) err.end = "La fin doit être postérieure au début.";
    if (v.location.trim().length < 2) err.location = "Le lieu est obligatoire (2 caractères minimum).";
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) err.capacity = "Indiquez une capacité entière (1 à 10 000).";
    setErrors(err); setFormError(null);
    if (Object.keys(err).length) return;
    setSaving(true);
    try {
      await onSubmit({
        courseId: editing ? session.courseId : v.course,
        course: courseName,
        trainerId: v.trainer === "none" ? null : v.trainer,
        trainer: trainerOptions.find((t) => t.id === v.trainer)?.name ?? null,
        startsAtIso: start.toISOString(),
        endsAtIso: end.toISOString(),
        start: "", end: "", time: "",
        location: v.location.trim(),
        capacity,
        status: "open",
      });
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "L'enregistrement a échoué.");
      setSaving(false);
    }
  }

  const inv = (k: keyof Errors) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la session" : "Nouvelle session"}</DialogTitle>
            <DialogDescription>
              {editing ? "La formation d'une session ne peut pas être changée." : "Une session ne peut pas être ajoutée à une formation archivée."}
            </DialogDescription>
          </DialogHeader>
          {formError && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-destructive">{formError}</p>}
          <Field id="course" label="Formation" error={errors.course}>
            <Select value={editing ? session.courseId ?? "none" : v.course} onValueChange={(c) => setV((s) => ({ ...s, course: c ?? "none" }))} disabled={editing || coursesState.loading}>
              <SelectTrigger id="course" className="h-10 w-full" {...inv("course")}><SelectValue>{courseLabel}</SelectValue></SelectTrigger>
              <SelectContent>{courseOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {coursesState.error && <p className="text-sm text-destructive">Impossible de charger les formations. <button type="button" className="underline underline-offset-4" onClick={coursesState.reload}>Réessayer</button></p>}
          </Field>
          <Field id="trainer" label="Formateur">
            <Select value={v.trainer} onValueChange={(t) => setV((s) => ({ ...s, trainer: t ?? "none" }))} disabled={trainersState.loading}>
              <SelectTrigger id="trainer" className="h-10 w-full"><SelectValue>{trainerLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non assigné</SelectItem>
                {trainerOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {trainersState.error && <p className="text-sm text-destructive">Impossible de charger les formateurs. <button type="button" className="underline underline-offset-4" onClick={trainersState.reload}>Réessayer</button></p>}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="start" label="Début" error={errors.start}><Input id="start" type="datetime-local" value={v.start} onChange={set("start")} {...inv("start")} /></Field>
            <Field id="end" label="Fin" error={errors.end}><Input id="end" type="datetime-local" value={v.end} onChange={set("end")} {...inv("end")} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="location" label="Lieu" error={errors.location}><Input id="location" value={v.location} onChange={set("location")} maxLength={150} {...inv("location")} /></Field>
            <Field id="capacity" label="Capacité" error={errors.capacity}><Input id="capacity" type="number" min={1} max={10000} value={v.capacity} onChange={set("capacity")} {...inv("capacity")} /></Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer la session"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}