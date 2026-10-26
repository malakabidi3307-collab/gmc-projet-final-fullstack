const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
throw new Error("La variable NEXT_PUBLIC_API_URL n'est pas configurée.");
}

  export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  ): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
  ...init,
  headers: {
  Accept: "application/json",
  ...(init?.body ? { "Content-Type": "application/json" } : {}),
  ...init?.headers,
  },
  cache: init?.cache ?? "no-store",
  });

if (!response.ok) {
throw new Error(
`Erreur API : ${response.status} ${response.statusText}`,
);
}

return (await response.json()) as T;
}

  export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, {
  method: "GET",
  });
  }

  export const getHealth = () => apiGet<unknown>("/api/health");
