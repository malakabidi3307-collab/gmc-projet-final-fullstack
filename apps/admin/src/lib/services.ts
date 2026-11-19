
import * as demo from "@/data/demo";
import { toDashboardData, type DashboardDto } from "./dashboard-adapter";
import { apiFetch } from "./api";
import { loginViaBff } from "./auth-client";
import { USE_DEMO } from "./config";
import { createResource } from "./resource";
import { coursesBinding } from "./adapters/courses";
import type { AttendanceRow, CurrentUser, DashboardData, Role } from "@/types";

export const courses = createResource("courses", [], coursesBinding);
export const students = createResource("students", demo.demoStudents);
export const trainers = createResource("trainers", demo.demoTrainers);
export const sessions = createResource("sessions", demo.demoSessionRows);
export const enrollments = createResource("enrollments", demo.demoEnrollments);
export const evaluations = createResource("evaluations", demo.demoEvaluations);
export const schedule = createResource("schedule", demo.demoSchedule);
export const notifications = createResource("notifications", demo.demoNotifications);
export const appUsers = createResource("users", demo.demoAppUsers);
export const learnerCourses = createResource("me/courses", demo.demoLearnerCourses);
export const attendanceRates = createResource("reports/attendance", demo.demoAttendanceRates);

// GET /api/auth/me
export async function getCurrentUser(): Promise<CurrentUser> {
  if (!USE_DEMO) return apiFetch<CurrentUser>("/api/auth/me");
  return demo.demoUser;
}
// PATCH /api/auth/me
export async function updateProfile(patch: { name: string; email: string; phone: string }): Promise<void> {
  if (!USE_DEMO) await apiFetch("/api/auth/me", { method: "PATCH", body: JSON.stringify(patch) });
}
// POST /api/auth/login
export async function login(creds: { email: string; password: string }): Promise<void> {
  await loginViaBff(creds);
}
// GET /api/admin/dashboard (via le proxy Next.js) : aucune donnee de demonstration.
export async function getDashboard(role: Role): Promise<DashboardData> {
  if (role !== "admin") throw new Error("Tableau de bord réservé à l'administration.");
  return toDashboardData(await apiFetch<DashboardDto>("/admin/dashboard"));
}

const attendanceStore = new Map<string, AttendanceRow[]>();
// GET /api/sessions/:id/attendance
export async function getAttendance(sessionId: string): Promise<AttendanceRow[]> {
  if (!USE_DEMO) return apiFetch<AttendanceRow[]>(`/api/sessions/${sessionId}/attendance`);
  return attendanceStore.get(sessionId) ?? demo.demoAttendance;
}
// PUT /api/sessions/:id/attendance
export async function saveAttendance(sessionId: string, rows: AttendanceRow[]): Promise<void> {
  if (!USE_DEMO) { await apiFetch(`/api/sessions/${sessionId}/attendance`, { method: "PUT", body: JSON.stringify(rows) }); return; }
  attendanceStore.set(sessionId, rows);
}

// POST /api/auth/password
export async function changePassword(v: { current: string; next: string }): Promise<void> {
  if (!USE_DEMO) await apiFetch("/api/auth/password", { method: "POST", body: JSON.stringify(v) });
}
// PATCH /api/settings
export async function saveSettings(v: Record<string, unknown>): Promise<void> {
  if (!USE_DEMO) await apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify(v) });
}
