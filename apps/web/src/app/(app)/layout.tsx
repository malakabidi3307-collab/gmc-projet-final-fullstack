import type { ReactNode } from "react";
import { AppSidebar } from "@/components/ifag/app-sidebar";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { demoUser } from "@/data/demo"; // TODO(API): utilisateur issu de la session

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar role={demoUser.role} />
      <SidebarInset>
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 md:px-6">
          <SidebarTrigger aria-label="Ouvrir ou fermer la navigation" />
          {demoUser.role === "admin" && <Input aria-label="Recherche globale" placeholder="Rechercher une formation, un apprenant…" className="hidden h-10 max-w-md md:block" />}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Avatar><AvatarFallback>{demoUser.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <span className="hidden sm:inline">{demoUser.name}</span>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl p-4 md:p-7">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
