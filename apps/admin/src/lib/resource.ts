import { ApiError, apiFetch } from "./api";
import { USE_DEMO } from "./config";

export interface Resource<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: Omit<T, "id">): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

/** Lie une ressource du front a un endpoint Express : chemin, cle d'enveloppe et conversions. */
export interface ApiBinding<T, Dto> {
  path: string; // ex. "/courses"
  itemKey: string; // ex. "course" : le detail est renvoye sous { course: ... }
  fromApi(dto: Dto): T;
  toCreate(input: Omit<T, "id">): unknown;
  toUpdate(patch: Partial<T>): unknown;
}

interface Page<Dto> {
  data: Dto[];
  meta: { totalPages: number };
}

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

async function listAll<Dto>(path: string): Promise<Dto[]> {
  const url = (page: number) => `${path}?pageSize=${PAGE_SIZE}&page=${page}`;
  const first = await apiFetch<Page<Dto>>(url(1));
  const rows = [...first.data];
  for (let page = 2; page <= Math.min(first.meta.totalPages, MAX_PAGES); page += 1) {
    rows.push(...(await apiFetch<Page<Dto>>(url(page))).data);
  }
  return rows;
}

function apiResource<T extends { id: string }, Dto>(api: ApiBinding<T, Dto>): Resource<T> {
  const one = (body: Record<string, Dto>) => api.fromApi(body[api.itemKey]);
  const json = (method: string, body?: unknown) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
  const url = (id: string) => `${api.path}/${encodeURIComponent(id)}`;
  return {
    async list() {
      return (await listAll<Dto>(api.path)).map(api.fromApi);
    },
    async get(id) {
      try {
        return one(await apiFetch<Record<string, Dto>>(url(id)));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return undefined;
        throw error;
      }
    },
    async create(input) {
      return one(await apiFetch<Record<string, Dto>>(api.path, json("POST", api.toCreate(input))));
    },
    async update(id, patch) {
      return one(await apiFetch<Record<string, Dto>>(url(id), json("PATCH", api.toUpdate(patch))));
    },
    async remove(id) {
      await apiFetch<void>(url(id), json("DELETE"));
    },
  };
}

/**
 * Avec un adaptateur : toujours l'API reelle (PostgreSQL).
 * Sans adaptateur : donnees de demonstration, le temps que la ressource soit migree.
 */
export function createResource<T extends { id: string }, Dto = never>(
  _path: string,
  seed: T[],
  api?: ApiBinding<T, Dto>,
): Resource<T> {
  if (api) return apiResource(api);
  void USE_DEMO;
  let store = [...seed];
  const wait = () => new Promise((r) => setTimeout(r, 150));
  return {
    async list() { await wait(); return [...store]; },
    async get(id) { await wait(); return store.find((x) => x.id === id); },
    async create(input) { await wait(); const item = { ...input, id: crypto.randomUUID() } as T; store = [item, ...store]; return item; },
    async update(id, patch) {
      await wait(); const cur = store.find((x) => x.id === id);
      if (!cur) throw new Error("Introuvable");
      const next = { ...cur, ...patch }; store = store.map((x) => (x.id === id ? next : x)); return next;
    },
    async remove(id) { await wait(); store = store.filter((x) => x.id !== id); },
  };
}