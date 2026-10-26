"use client";

import { useRouter } from "next/navigation";
import { Brand } from "@/components/ifag/brand";
import { LoginForm } from "@/components/ifag/login-form";
import { login } from "@/lib/services";

export default function LoginPage() {
  const router = useRouter();
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Brand className="text-white" />
        <div className="max-w-md">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-white">Piloter la formation, simplement.</h2>
          <p>Formations, sessions, présences et résultats réunis dans un espace unique pour l’administration, les formateurs et les apprenants.</p>
        </div>
        <small>Emplacement du logo institutionnel : symbole temporaire.</small>
      </section>
      <section className="grid place-items-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="mb-2 text-2xl font-semibold">Bienvenue sur IFAG Formation</h1>
          <p className="mb-6 text-muted-foreground">Connectez-vous avec votre compte institutionnel.</p>
          <LoginForm onSubmit={async (v) => { await login(v); router.push("/dashboard"); }} />
        </div>
      </section>
    </main>
  );
}
