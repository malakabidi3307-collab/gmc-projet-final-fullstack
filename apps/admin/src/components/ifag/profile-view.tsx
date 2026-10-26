"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, updateProfile } from "@/lib/services";
import { PageHeader } from "./page-header";
import { useCurrentUser } from "./role-context";

export function ProfileView() {
  const { user } = useCurrentUser();
  const [v, setV] = useState({ name: user.name, email: user.email, phone: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState(false);
  const [p, setP] = useState({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!v.name.trim() || !/^\S+@\S+\.\S+$/.test(v.email)) return setMsg({ ok: false, text: "Nom et adresse e-mail valides requis." });
    try { await updateProfile(v); setMsg({ ok: true, text: "Profil enregistré." }); } catch { setMsg({ ok: false, text: "L’enregistrement a échoué." }); }
  }
  async function submitPw(e: FormEvent) {
    e.preventDefault();
    if (p.next.length < 8) return setPwErr("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    if (p.next !== p.confirm) return setPwErr("La confirmation ne correspond pas.");
    try { await changePassword({ current: p.current, next: p.next }); setPw(false); setP({ current: "", next: "", confirm: "" }); setPwErr(null); setMsg({ ok: true, text: "Mot de passe modifié." }); }
    catch { setPwErr("Impossible de modifier le mot de passe."); }
  }
  const f = (id: string, label: string, val: string, on: (s: string) => void, type = "text") => (
    <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={val} onChange={(e) => on(e.target.value)} className="h-10" /></div>
  );
  return (
    <>
      <PageHeader title="Profil" description="Vos informations personnelles." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Informations personnelles</CardTitle></CardHeader>
          <CardContent><form onSubmit={save} noValidate className="grid gap-4">
            {f("name", "Nom complet", v.name, (s) => setV({ ...v, name: s }))}{f("email", "Adresse e-mail", v.email, (s) => setV({ ...v, email: s }), "email")}{f("phone", "Téléphone", v.phone, (s) => setV({ ...v, phone: s }), "tel")}
            {msg && <p role="status" className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
            <div><Button type="submit">Enregistrer</Button></div>
          </form></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sécurité</CardTitle></CardHeader>
          <CardContent><Button variant="outline" onClick={() => setPw(true)}>Changer le mot de passe</Button></CardContent>
        </Card>
      </div>
      <Dialog open={pw} onOpenChange={setPw}>
        <DialogContent><form onSubmit={submitPw} noValidate className="grid gap-4">
          <DialogHeader><DialogTitle>Changer le mot de passe</DialogTitle><DialogDescription>Action sensible : saisissez votre mot de passe actuel.</DialogDescription></DialogHeader>
          {f("cur", "Mot de passe actuel", p.current, (s) => setP({ ...p, current: s }), "password")}
          {f("nxt", "Nouveau mot de passe", p.next, (s) => setP({ ...p, next: s }), "password")}
          {f("cfm", "Confirmation", p.confirm, (s) => setP({ ...p, confirm: s }), "password")}
          {pwErr && <p role="alert" className="text-sm text-destructive">{pwErr}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setPw(false)}>Annuler</Button><Button type="submit">Modifier</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>
    </>
  );
}
