"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/ifag/app-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { USE_DEMO } from "@/lib/config";
import { initials } from "./person-cell";
import { useCurrentUser } from "./role-context";
import type { Role } from "@/types";

const ROLES: Record<Role, string> = { admin: "Administrateur", trainer: "Formateur", learner: "Apprenant" };

export function AppShell({ children }: { children: ReactNode }) {
  const { user, setRole } = useCurrentUser();
  return (
    <SidebarProvider>
      <AppSidebar role={user.role} />
      <SidebarInset>
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 md:px-6">
          <SidebarTrigger aria-label="Ouvrir ou fermer la navigation" />
          {user.role === "admin" && <Input aria-label="Recherche globale" placeholder="Rechercher une formation, un apprenant…" className="hidden h-10 max-w-md md:block" />}
          <div className="ml-auto flex items-center gap-3 text-sm">
            {USE_DEMO && (
              <Select value={user.role} onValueChange={(r) => setRole((r ?? "admin") as Role)}>
                <SelectTrigger aria-label="Rôle de démonstration" className="h-9 w-44"><SelectValue>Démo : {ROLES[user.role]}</SelectValue></SelectTrigger>
                <SelectContent>{Object.entries(ROLES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Avatar><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
            <span className="hidden sm:inline">{user.name}</span>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl p-4 md:p-7">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
