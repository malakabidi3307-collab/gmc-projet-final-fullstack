"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { demoCourses } from "@/data/demo";
import { CourseTable } from "./course-table";
import { CreateCourseDialog } from "./create-course-dialog";
import { DemoNotice, PageHeader } from "./page-header";
import type { Course } from "@/types";

export function CoursesView() {
  const [courses, setCourses] = useState<Course[]>(demoCourses); // TODO(API): GET /api/courses
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader title="Formations" description="Gérez le catalogue et les programmes pédagogiques." actions={<Button onClick={() => setOpen(true)}>Nouvelle formation</Button>} />
      <CourseTable courses={courses} onArchive={(id) => setCourses((cs) => cs.map((c) => (c.id === id ? { ...c, status: "archived" } : c)))} />
      <div className="mt-4"><DemoNotice /></div>
      <CreateCourseDialog open={open} onOpenChange={setOpen} onCreate={(c) => setCourses((cs) => [c, ...cs])} />
    </>
  );
}
