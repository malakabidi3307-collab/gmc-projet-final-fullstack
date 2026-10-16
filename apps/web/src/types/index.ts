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
