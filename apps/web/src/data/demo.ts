// DONNÉES DE DÉMONSTRATION — fictives, à remplacer par les réponses de l'API.
// Aucune statistique officielle d'IFAG n'est représentée ici.
import type { Course, CurrentUser, Stat, UpcomingSession } from "@/types";

export const demoUser: CurrentUser = {
  name: "Administrateur (démo)",
  email: "admin@demo.example",
  role: "admin",
};

export const demoStats: Stat[] = [
  { label: "Apprenants", value: "248", trend: "+12 vs août", tone: "positive" },
  { label: "Formateurs", value: "19", trend: "Stable vs août", tone: "neutral" },
  { label: "Formations actives", value: "14", trend: "+2 vs août", tone: "positive" },
  { label: "Sessions à venir (30 j)", value: "9", trend: "−3 vs août", tone: "negative" },
];

export const demoEnrollments = [28, 35, 31, 44, 52, 60];
export const demoEnrollmentMonths = ["avr", "mai", "juin", "juil", "août", "sept"];

export const demoSessions: UpcomingSession[] = [
  { id: "s1", course: "Gestion de projet", trainer: "S. Benali", startsAt: "15 oct., 09:00", location: "Salle B2", enrolled: 18, capacity: 20 },
  { id: "s2", course: "Comptabilité appliquée", trainer: "K. Merabet", startsAt: "19 oct., 14:00", location: "Salle A1", enrolled: 12, capacity: 25 },
  { id: "s3", course: "Marketing digital", trainer: "L. Haddad", startsAt: "22 oct., 09:00", location: "En ligne", enrolled: 20, capacity: 20 },
];

export const demoAlerts = [
  { id: "a1", tone: "warning", text: "3 sessions sans formateur" },
  { id: "a2", tone: "danger", text: "Marketing digital : session complète" },
  { id: "a3", tone: "info", text: "5 présences à valider" },
] as const;

export const demoCourses: Course[] = [
  { id: "c1", name: "Gestion de projet", category: "Management", trainer: "S. Benali", enrolled: 38, durationHours: 40, status: "published", updatedAt: "02/10/2026" },
  { id: "c2", name: "Comptabilité appliquée", category: "Finance", trainer: "K. Merabet", enrolled: 27, durationHours: 60, status: "published", updatedAt: "28/09/2026" },
  { id: "c3", name: "Marketing digital", category: "Commerce", trainer: "L. Haddad", enrolled: 20, durationHours: 35, status: "published", updatedAt: "25/09/2026" },
  { id: "c4", name: "Droit du travail", category: "Juridique", trainer: null, enrolled: 0, durationHours: 24, status: "draft", updatedAt: "20/09/2026" },
  { id: "c5", name: "Bureautique avancée", category: "Informatique", trainer: "R. Cherif", enrolled: 44, durationHours: 30, status: "archived", updatedAt: "01/09/2026" },
  { id: "c6", name: "Communication professionnelle", category: "Management", trainer: "S. Benali", enrolled: 15, durationHours: 20, status: "published", updatedAt: "30/08/2026" },
];
