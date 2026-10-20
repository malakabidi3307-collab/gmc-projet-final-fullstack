// DONNÉES DE DÉMONSTRATION — fictives, à remplacer par les réponses de l'API.
// Aucune statistique officielle d'IFAG n'est représentée ici.
import type { AttendanceRow, Course, CurrentUser, Enrollment, Evaluation, ScheduleEvent, SessionRow, Stat, Student, Trainer, UpcomingSession } from "@/types";

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

export const demoEnrollments_series = [28, 35, 31, 44, 52, 60];
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

// ---- Lot 1 : apprenants, formateurs, sessions (DÉMO) ----

export const demoStudents: Student[] = [
  { id: "u1", name: "Amina Meziane", email: "amina.m@demo.example", courses: 2, status: "active", joinedAt: "02/09/2026" },
  { id: "u2", name: "Yacine Boudiaf", email: "yacine.b@demo.example", courses: 1, status: "active", joinedAt: "04/09/2026" },
  { id: "u3", name: "Nadia Khelifi", email: "nadia.k@demo.example", courses: 3, status: "pending", joinedAt: "10/09/2026" },
  { id: "u4", name: "Omar Teffahi", email: "omar.t@demo.example", courses: 0, status: "disabled", joinedAt: "28/08/2026" },
  { id: "u5", name: "Lina Hamidi", email: "lina.h@demo.example", courses: 1, status: "active", joinedAt: "11/09/2026" },
  { id: "u6", name: "Rayan Slimani", email: "rayan.s@demo.example", courses: 2, status: "active", joinedAt: "12/09/2026" },
  { id: "u7", name: "Sarah Ouali", email: "sarah.o@demo.example", courses: 1, status: "pending", joinedAt: "15/09/2026" },
];

export const demoTrainers: Trainer[] = [
  { id: "t1", name: "S. Benali", specialty: "Management", courses: 2, sessions: 4, email: "s.benali@demo.example" },
  { id: "t2", name: "K. Merabet", specialty: "Finance", courses: 1, sessions: 3, email: "k.merabet@demo.example" },
  { id: "t3", name: "L. Haddad", specialty: "Commerce", courses: 1, sessions: 2, email: "l.haddad@demo.example" },
  { id: "t4", name: "R. Cherif", specialty: "Informatique", courses: 1, sessions: 1, email: "r.cherif@demo.example" },
];

export const demoSessionRows: SessionRow[] = [
  { id: "s1", course: "Gestion de projet", trainer: "S. Benali", start: "15/10/2026", end: "12/11/2026", time: "09:00–12:00", location: "Salle B2", enrolled: 18, capacity: 20, status: "open" },
  { id: "s2", course: "Marketing digital", trainer: "L. Haddad", start: "22/10/2026", end: "19/11/2026", time: "09:00–12:00", location: "En ligne", enrolled: 20, capacity: 20, status: "full" },
  { id: "s3", course: "Comptabilité appliquée", trainer: null, start: "19/10/2026", end: "30/11/2026", time: "14:00–17:00", location: "Salle A1", enrolled: 12, capacity: 25, status: "no-trainer" },
  { id: "s4", course: "Bureautique avancée", trainer: "R. Cherif", start: "01/09/2026", end: "30/09/2026", time: "10:00–12:00", location: "Salle C3", enrolled: 22, capacity: 24, status: "ended" },
];

// ---- Lot 2 : emploi du temps, présences, évaluations, inscriptions (DÉMO) ----
// Semaine 0 = lundi 12 octobre 2026.
export const SCHEDULE_BASE = "2026-10-12";
export const demoSchedule: ScheduleEvent[] = [
  { id: "e1", week: 0, day: 2, startHour: 9, endHour: 12, course: "Marketing digital", trainer: "L. Haddad", location: "En ligne" },
  { id: "e2", week: 0, day: 3, startHour: 9, endHour: 12, course: "Gestion de projet", trainer: "S. Benali", location: "Salle B2" },
  { id: "e3", week: 0, day: 0, startHour: 14, endHour: 17, course: "Comptabilité appliquée", trainer: "K. Merabet", location: "Salle A1" },
  { id: "e4", week: 1, day: 0, startHour: 14, endHour: 17, course: "Comptabilité appliquée", trainer: "K. Merabet", location: "Salle A1" },
  { id: "e5", week: 1, day: 3, startHour: 9, endHour: 12, course: "Gestion de projet", trainer: "S. Benali", location: "Salle B2" },
];

export const demoAttendance: AttendanceRow[] = [
  { studentId: "u1", name: "Amina Meziane", status: "present" },
  { studentId: "u2", name: "Yacine Boudiaf", status: "present" },
  { studentId: "u3", name: "Nadia Khelifi", status: "absent" },
  { studentId: "u5", name: "Lina Hamidi", status: "late" },
];

export const demoEvaluations: Evaluation[] = [
  { id: "v1", title: "Quiz 2", course: "Gestion de projet", score: 15, max: 20, status: "validated" },
  { id: "v2", title: "Étude de cas", course: "Marketing digital", score: null, max: 20, status: "pending" },
  { id: "v3", title: "Examen final", course: "Comptabilité appliquée", score: 9, max: 20, status: "failed" },
  { id: "v4", title: "Quiz 1", course: "Gestion de projet", score: 13, max: 20, status: "validated" },
];

export const demoEnrollments: Enrollment[] = [
  { id: "i1", student: "Amina Meziane", course: "Gestion de projet", date: "02/09/2026", status: "confirmed" },
  { id: "i2", student: "Nadia Khelifi", course: "Marketing digital", date: "10/09/2026", status: "pending" },
  { id: "i3", student: "Rayan Slimani", course: "Comptabilité appliquée", date: "12/09/2026", status: "pending" },
  { id: "i4", student: "Omar Teffahi", course: "Bureautique avancée", date: "20/08/2026", status: "cancelled" },
  { id: "i5", student: "Lina Hamidi", course: "Gestion de projet", date: "11/09/2026", status: "confirmed" },
  { id: "i6", student: "Sarah Ouali", course: "Marketing digital", date: "15/09/2026", status: "pending" },
];

// ---- Lot 3 : notifications, utilisateurs, espace apprenant, rapports (DÉMO) ----
import type { AppNotification, AppUser, AttendanceRate, LearnerCourse } from "@/types";

export const demoNotifications: AppNotification[] = [
  { id: "n1", title: "Changement de salle", body: "La session du 15 octobre se tient en salle B2.", date: "13/10/2026", read: false },
  { id: "n2", title: "Évaluation finale ouverte", body: "Disponible jusqu'au 30 octobre.", date: "10/10/2026", read: false },
  { id: "n3", title: "Nouvelle inscription validée", body: "Votre inscription à Marketing digital est confirmée.", date: "05/10/2026", read: true },
];
export const demoAppUsers: AppUser[] = [
  { id: "a1", name: "Administrateur (démo)", email: "admin@demo.example", role: "admin" },
  { id: "a2", name: "S. Benali", email: "s.benali@demo.example", role: "trainer" },
  { id: "a3", name: "K. Merabet", email: "k.merabet@demo.example", role: "trainer" },
  { id: "a4", name: "Amina Meziane", email: "amina.m@demo.example", role: "learner" },
  { id: "a5", name: "Yacine Boudiaf", email: "yacine.b@demo.example", role: "learner" },
];
export const demoLearnerCourses: LearnerCourse[] = [
  { id: "l1", name: "Gestion de projet", trainer: "S. Benali", progress: 65, nextSession: "15 oct., 09:00 · Salle B2" },
  { id: "l2", name: "Marketing digital", trainer: "L. Haddad", progress: 30, nextSession: "22 oct., 09:00 · En ligne" },
];
export const demoAttendanceRates: AttendanceRate[] = [
  { id: "r1", course: "Gestion de projet", enrolled: 38, rate: 92 },
  { id: "r2", course: "Comptabilité appliquée", enrolled: 27, rate: 85 },
  { id: "r3", course: "Marketing digital", enrolled: 20, rate: 88 },
];
