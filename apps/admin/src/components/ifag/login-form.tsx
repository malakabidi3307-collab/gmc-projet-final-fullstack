"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ onSubmit }: { onSubmit: (v: { email: string; password: string; remember: boolean }) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  async function handle(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Saisissez une adresse e-mail valide.";
    if (!password) next.password = "Le mot de passe est obligatoire.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try { await onSubmit({ email, password, remember }); }
    catch { setErrors({ form: "Connexion impossible. Vérifiez vos identifiants puis réessayez." }); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handle} noValidate className="grid gap-5">
      {errors.form && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-destructive">{errors.form}</p>}
      <div className="grid gap-1.5">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} className="h-11" />
        {errors.email && <p id="email-err" className="text-sm text-destructive">{errors.email}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? "pw-err" : undefined} className="h-11 pr-12" />
          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-9" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
            {show ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        {errors.password && <p id="pw-err" className="text-sm text-destructive">{errors.password}</p>}
      </div>
      <div className="flex items-center justify-between text-sm">
        <Label htmlFor="remember" className="font-normal"><Checkbox id="remember" checked={remember} onCheckedChange={(c) => setRemember(c === true)} />Se souvenir de moi</Label>
        <a href="#" className="font-semibold text-secondary-foreground underline-offset-4 hover:underline">Mot de passe oublié ?</a>
      </div>
      <Button type="submit" size="lg" className="h-11" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}{loading ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-xs text-muted-foreground">Pas d’inscription publique : les comptes sont créés par l’administration.</p>
    </form>
  );
}
