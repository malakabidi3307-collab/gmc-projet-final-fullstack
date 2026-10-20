"use client";

import { useCallback, useEffect, useState } from "react";
import type { Resource } from "@/lib/resource";

const msg = (e: unknown) => (e instanceof Error ? e.message : "Erreur inattendue");

export function useResource<T extends { id: string }>(r: Resource<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await r.list()); } catch (e) { setError(msg(e)); } finally { setLoading(false); }
  }, [r]);
  useEffect(() => { load(); }, [load]);
  return {
    data, loading, error, reload: load,
    create: async (input: Omit<T, "id">) => { const c = await r.create(input); setData((d) => [c, ...d]); return c; },
    update: async (id: string, patch: Partial<T>) => { const u = await r.update(id, patch); setData((d) => d.map((x) => (x.id === id ? u : x))); return u; },
    remove: async (id: string) => { await r.remove(id); setData((d) => d.filter((x) => x.id !== id)); },
  };
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => { setLoading(true); setError(null); try { setData(await fn()); } catch (e) { setError(msg(e)); } finally { setLoading(false); } }, deps);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}
