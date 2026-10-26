"use client";

import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { USE_DEMO } from "@/lib/config";
import { AppSidebar } from "./app-sidebar";
import { initials } from "./person-cell";
import { useCurrentUser } from "./role-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 md:px-6">
          <SidebarTrigger aria-label="Ouvrir ou fermer la navigation" />
          <Input aria-label="Recherche globale" placeholder="Rechercher une formation, un apprenant…" className="hidden h-10 max-w-md md:block" />
          <div className="ml-auto flex items-center gap-3 text-sm">
            {USE_DEMO && <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">Démo : non authentifié</span>}
            <Avatar><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
            <span className="hidden sm:inline">{user.name}</span>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl p-4 md:p-7">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
