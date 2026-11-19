"use client";

import { useEffect, useRef, useState } from "react";
import type { Resource } from "@/lib/resource";

const msg = (e: unknown) => (e instanceof Error ? e.message : "Erreur inattendue");

export function useResource<T extends { id: string }>(r: Resource<T>) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ version: number; data: T[]; error: string | null }>({
    version: -1,
    data: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    r.list().then(
      (data) => { if (!cancelled) setState({ version, data, error: null }); },
      (e) => { if (!cancelled) setState((s) => ({ ...s, version, error: msg(e) })); },
    );
    return () => { cancelled = true; };
  }, [r, version]);

  return {
    data: state.data,
    loading: state.version !== version,
    error: state.version === version ? state.error : null,
    reload: () => setVersion((v) => v + 1),
    create: async (input: Omit<T, "id">) => {
      const created = await r.create(input);
      setState((s) => ({ ...s, data: [created, ...s.data] }));
      return created;
    },
    update: async (id: string, patch: Partial<T>) => {
      const updated = await r.update(id, patch);
      setState((s) => ({ ...s, data: s.data.map((x) => (x.id === id ? updated : x)) }));
      return updated;
    },
    remove: async (id: string) => {
      await r.remove(id);
      setState((s) => ({ ...s, data: s.data.filter((x) => x.id !== id) }));
    },
  };
}

/** Charge une donnee asynchrone ; se recharge quand `deps` change (comparees par valeur serialisee). */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const key = JSON.stringify(deps);
  const [version, setVersion] = useState(0);
  const requestId = `${key}#${version}`;
  const [state, setState] = useState<{ id: string; data?: T; error: string | null }>({ id: "", error: null });
  const fnRef = useRef(fn);

  useEffect(() => { fnRef.current = fn; });

  useEffect(() => {
    let cancelled = false;
    fnRef.current().then(
      (data) => { if (!cancelled) setState({ id: requestId, data, error: null }); },
      (e) => { if (!cancelled) setState({ id: requestId, error: msg(e) }); },
    );
    return () => { cancelled = true; };
  }, [requestId]);

  const settled = state.id === requestId;
  return {
    data: settled ? state.data : undefined,
    loading: !settled,
    error: settled ? state.error : null,
    reload: () => setVersion((v) => v + 1),
  };
}