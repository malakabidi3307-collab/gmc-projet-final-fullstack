"use client";

import { useResource } from "@/hooks/use-resource";
import { students } from "@/lib/services";
import { PageHeader } from "./page-header";
import { DataBoundary } from "./state-views";
import { StudentTable } from "./student-table";

export function StudentsView() {
  const { data, loading, error, reload, update } = useResource(students);
  return (
    <>
      <PageHeader title="Apprenants" description="Consultez et gérez les comptes des apprenants." />
      <DataBoundary loading={loading} error={error} onRetry={reload}>
        <StudentTable students={data} onDisable={(id) => update(id, { status: "disabled" })} />
      </DataBoundary>
    </>
  );
}
