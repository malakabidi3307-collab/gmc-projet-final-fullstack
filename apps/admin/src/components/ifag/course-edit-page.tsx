"use client";

import { useParams } from "next/navigation";
import { useAsync } from "@/hooks/use-resource";
import { courses } from "@/lib/services";
import { CourseForm } from "./course-form";
import { PageHeader } from "./page-header";
import { DataBoundary, EmptyState } from "./state-views";

export function CourseEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: course, loading, error, reload } = useAsync(() => courses.get(id), [id]);
  return (
    <>
      <PageHeader title={course ? `Modifier ${course.name}` : "Modifier la formation"} description="Mettez à jour les informations, le contenu et le statut." />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
        {course ? <CourseForm key={course.id} course={course} /> : <EmptyState title="Formation introuvable" />}
      </DataBoundary>
    </>
  );
}