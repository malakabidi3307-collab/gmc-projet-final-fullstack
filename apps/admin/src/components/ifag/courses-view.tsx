"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/use-resource";
import { courses } from "@/lib/services";
import { CourseTable } from "./course-table";
import { CreateCourseDialog } from "./create-course-dialog";
import { PageHeader } from "./page-header";
import { DataBoundary } from "./state-views";

export function CoursesView() {
  const { data, loading, error, reload, create, update } = useResource(courses);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader title="Formations" description="Gérez le catalogue et les programmes pédagogiques." actions={<Button onClick={() => setOpen(true)}>Nouvelle formation</Button>} />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
        <CourseTable courses={data} onArchive={(id) => update(id, { status: "archived" })} />
      </DataBoundary>
      <CreateCourseDialog open={open} onOpenChange={setOpen} onCreate={async (c) => { await create(c); }} />
    </>
  );
}
