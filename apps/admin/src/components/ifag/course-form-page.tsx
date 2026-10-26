"use client";

import { CourseForm } from "./course-form";
import { PageHeader } from "./page-header";

export function CourseFormPage() {
  return (
    <>
      <PageHeader title="Nouvelle formation" description="Renseignez les informations, le contenu et le statut de publication." />
      <CourseForm />
    </>
  );
}
