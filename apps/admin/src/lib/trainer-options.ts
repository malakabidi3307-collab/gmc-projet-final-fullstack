import { apiFetch } from "./api";

export interface TrainerOption {
  id: string;
  name: string;
}

interface UsersPage {
  data: { id: string; name: string }[];
  meta: { totalPages: number };
}

const MAX_PAGES = 10;

/** Comptes TRAINER actifs de PostgreSQL (GET /api/users), tries par nom. */
export async function listTrainerOptions(): Promise<TrainerOption[]> {
  const url = (page: number) => `/users?role=TRAINER&status=ACTIVE&sort=name&order=asc&pageSize=100&page=${page}`;
  const first = await apiFetch<UsersPage>(url(1));
  const rows = [...first.data];
  for (let page = 2; page <= Math.min(first.meta.totalPages, MAX_PAGES); page += 1) {
    rows.push(...(await apiFetch<UsersPage>(url(page))).data);
  }
  return rows.map(({ id, name }) => ({ id, name }));
}