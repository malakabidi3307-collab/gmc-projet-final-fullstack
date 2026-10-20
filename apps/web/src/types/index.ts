export type Role = "admin" | "trainer" | "learner";
export type CourseStatus = "published" | "draft" | "archived";

export interface Course {
  id: string;
  name: string;
  category: string;
  trainer: string | null;
  enrolled: number;
  durationHours: number;
  status: CourseStatus;
  updatedAt: string;
}

export interface Stat {
  label: string;
  value: string;
  trend?: string;
  tone?: "positive" | "negative" | "neutral";
}

export interface UpcomingSession {
  id: string;
  course: string;
  trainer: string | null;
  startsAt: string;
  location: string;
  enrolled: number;
  capacity: number;
}

export interface CurrentUser {
  name: string;
  email: string;
  role: Role;
}

export type AccountStatus = "active" | "pending" | "disabled";
export interface Student {
  id: string; name: string; email: string; courses: number; status: AccountStatus; joinedAt: string;
}
export interface Trainer {
  id: string; name: string; specialty: string; courses: number; sessions: number; email: string;
}
export type SessionStatus = "open" | "full" | "no-trainer" | "ended";
export interface SessionRow {
  id: string; course: string; trainer: string | null; start: string; end: string;
  time: string; location: string; enrolled: number; capacity: number; status: SessionStatus;
}

export interface ScheduleEvent {
  id: string; week: number; day: 0 | 1 | 2 | 3 | 4; startHour: number; endHour: number;
  course: string; trainer: string; location: string;
}
export type AttendanceStatus = "present" | "absent" | "late";
export interface AttendanceRow { studentId: string; name: string; status: AttendanceStatus }
export type EvaluationStatus = "validated" | "pending" | "failed";
export interface Evaluation { id: string; title: string; course: string; score: number | null; max: number; status: EvaluationStatus }
export type EnrollmentStatus = "confirmed" | "pending" | "cancelled";
export interface Enrollment { id: string; student: string; course: string; date: string; status: EnrollmentStatus }

export interface AppNotification { id: string; title: string; body: string; date: string; read: boolean }
export interface AppUser { id: string; name: string; email: string; role: Role }
export interface LearnerCourse { id: string; name: string; trainer: string; progress: number; nextSession: string | null }
export interface AttendanceRate { id: string; course: string; enrolled: number; rate: number }
export interface DashboardAlert { id: string; tone: "warning" | "danger" | "info"; text: string }
export interface DashboardData {
  stats: Stat[]; sessions: UpcomingSession[]; alerts: DashboardAlert[]; months: string[]; enrollments: number[];
}
