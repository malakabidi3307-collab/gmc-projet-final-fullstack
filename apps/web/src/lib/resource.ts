import { apiFetch } from "./api";
import { USE_DEMO } from "./config";

export interface Resource<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: Omit<T, "id">): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}


export function createResource<T extends { id: string }>(path: string, seed: T[]): Resource<T> {
  if (!USE_DEMO) {
    const json = (method: string, body?: unknown) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
    return {
      list: () => apiFetch<T[]>(`/api/${path}`),
      get: (id) => apiFetch<T>(`/api/${path}/${id}`),
      create: (input) => apiFetch<T>(`/api/${path}`, json("POST", input)),
      update: (id, patch) => apiFetch<T>(`/api/${path}/${id}`, json("PATCH", patch)),
      remove: (id) => apiFetch<void>(`/api/${path}/${id}`, json("DELETE")),
    };
  }
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
