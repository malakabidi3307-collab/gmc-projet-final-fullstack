import { Award, Bell, BookOpen, CalendarDays, ClipboardCheck, LayoutDashboard, TrendingUp, User, type LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export interface NavItem { label: string; href: string; icon: LucideIcon }
export interface NavGroup { label?: string; items: NavItem[] }

export const NAV: Partial<Record<Role, NavGroup[]>> = {
  trainer: [{ items: [
    { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
    { label: "Mes formations", href: "/formations", icon: BookOpen },
    { label: "Mes sessions", href: "/sessions", icon: CalendarDays },
    { label: "Mon emploi du temps", href: "/emploi-du-temps", icon: CalendarDays },
    { label: "Présences", href: "/presences", icon: ClipboardCheck },
    { label: "Évaluations", href: "/evaluations", icon: Award },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Profil", href: "/profil", icon: User },
  ] }],
  learner: [{ items: [
    { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
    { label: "Mes formations", href: "/formations", icon: BookOpen },
    { label: "Mon planning", href: "/planning", icon: CalendarDays },
    { label: "Ma progression", href: "/progression", icon: TrendingUp },
    { label: "Mes résultats", href: "/resultats", icon: Award },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Profil", href: "/profil", icon: User },
  ] }],
};
