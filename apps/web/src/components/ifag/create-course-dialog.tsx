"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Course } from "@/types";

type Draft = Pick<Course, "name" | "category" | "durationHours"> & { description: string };

export function CreateCourseDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (c: Omit<Course, "id">) => void | Promise<void> }) {
  const [name, setName] = useState(""); const [category, setCategory] = useState("");
  const [hours, setHours] = useState(""); const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Le nom est obligatoire.";
    if (!category.trim()) err.category = "La catégorie est obligatoire.";
    if (!(Number(hours) > 0)) err.hours = "Indiquez une durée en heures.";
    setErrors(err);
    if (Object.keys(err).length) return;
    onCreate({ name, category, trainer: null, enrolled: 0, durationHours: Number(hours), status: "draft", updatedAt: "Aujourd’hui" });
    setName(""); setCategory(""); setHours(""); setDescription(""); onOpenChange(false);
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
            <DialogDescription>La formation est créée en brouillon. Démo : elle n’est pas enregistrée en base.</DialogDescription>
          </DialogHeader>
          {field("name", "Nom de la formation", <Input id="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />)}
          {field("category", "Catégorie", <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} aria-invalid={!!errors.category} />)}
          {field("hours", "Durée (heures)", <Input id="hours" type="number" min={1} value={hours} onChange={(e) => setHours(e.target.value)} aria-invalid={!!errors.hours} />)}
          {field("description", "Description", <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />)}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">Créer la formation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
