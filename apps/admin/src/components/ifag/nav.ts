import { Award, BarChart3, Bell, BookOpen, CalendarDays, ClipboardCheck, GraduationCap, LayoutDashboard, Settings, User, UserCog, Users, type LucideIcon } from "lucide-react";

export interface NavItem { label: string; href: string; icon: LucideIcon }
export interface NavGroup { label?: string; items: NavItem[] }

// Navigation de l'application d'administration uniquement.
export const ADMIN_NAV: NavGroup[] = [
  { label: "Vue générale", items: [{ label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard }] },
  { label: "Gestion pédagogique", items: [
    { label: "Formations", href: "/formations", icon: BookOpen },
    { label: "Sessions", href: "/sessions", icon: CalendarDays },
    { label: "Inscriptions", href: "/inscriptions", icon: ClipboardCheck },
    { label: "Emploi du temps", href: "/emploi-du-temps", icon: CalendarDays },
    { label: "Présences", href: "/presences", icon: ClipboardCheck },
    { label: "Évaluations", href: "/evaluations", icon: Award },
  ] },
  { label: "Personnes", items: [
    { label: "Apprenants", href: "/apprenants", icon: GraduationCap },
    { label: "Formateurs", href: "/formateurs", icon: Users },
    { label: "Utilisateurs et rôles", href: "/utilisateurs", icon: UserCog },
  ] },
  { label: "Pilotage", items: [{ label: "Rapports et statistiques", href: "/rapports", icon: BarChart3 }] },
  { label: "Préférences", items: [
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Paramètres", href: "/parametres", icon: Settings },
    { label: "Profil", href: "/profil", icon: User },
  ] },
];
