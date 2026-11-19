"use client";

import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { logoutViaBff } from "@/lib/auth-client";
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
            <Avatar><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
            <span className="hidden sm:inline">{user.name}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void logoutViaBff()}>
              <LogOut aria-hidden="true" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl p-4 md:p-7">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}