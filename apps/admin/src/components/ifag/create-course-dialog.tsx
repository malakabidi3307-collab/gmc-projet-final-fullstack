"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Course } from "@/types";

export function CreateCourseDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (c: Omit<Course, "id">) => void | Promise<void> }) {
  const [name, setName] = useState(""); const [category, setCategory] = useState("");
  const [hours, setHours] = useState(""); const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (name.trim().length < 2) err.name = "Le nom est obligatoire (2 caractères minimum).";
    if (category.trim().length < 2) err.category = "La catégorie est obligatoire (2 caractères minimum).";
    if (!Number.isInteger(Number(hours)) || Number(hours) < 1) err.hours = "Indiquez une durée entière en heures.";
    setErrors(err);
    setFormError(null);
    if (Object.keys(err).length) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), category: category.trim(), trainer: null, trainerId: null, description: description.trim(), enrolled: 0, durationHours: Number(hours), status: "draft", updatedAt: "" });
      setName(""); setCategory(""); setHours(""); setDescription(""); onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "La création a échoué.");
    } finally {
      setSaving(false);
    }
  }

  const field = (id: string, label: string, el: React.ReactNode) => (
    <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label>{el}{errors[id] && <p className="text-sm text-destructive">{errors[id]}</p>}</div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nouvelle formation</DialogTitle>
            <DialogDescription>La formation est créée en brouillon. Vous pourrez la publier ensuite.</DialogDescription>
          </DialogHeader>
          {formError && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-destructive">{formError}</p>}
          {field("name", "Nom de la formation", <Input id="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />)}
          {field("category", "Catégorie", <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} aria-invalid={!!errors.category} />)}
          {field("hours", "Durée (heures)", <Input id="hours" type="number" min={1} value={hours} onChange={(e) => setHours(e.target.value)} aria-invalid={!!errors.hours} />)}
          {field("description", "Description", <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />)}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? "Création…" : "Créer la formation"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}