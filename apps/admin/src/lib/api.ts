// Client des appels de donnees : le navigateur parle uniquement au proxy Next.js (/api/backend), meme origine.
// Les chemins sont ceux d'Express, sans prefixe : "/courses" ou "/admin/dashboard" ("/api/courses" est aussi accepte).
const BASE = "/api/backend";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

function fallbackMessage(status: number): string {
  if (status === 403) return "Action non autorisée.";
  if (status === 404) return "Ressource introuvable.";
  if (status === 409) return "Cette opération entre en conflit avec l'état actuel des données.";
  if (status >= 500) return "Le serveur a rencontré une erreur. Réessayez plus tard.";
  return "La requête a échoué.";
}

async function toError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ErrorBody | null;
  return new ApiError(res.status, body?.error?.code ?? "HTTP_ERROR", body?.error?.message ?? fallbackMessage(res.status));
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE}${path.replace(/^\/api(?=\/)/, "")}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Le serveur est injoignable.");
  }
}

// Un seul renouvellement a la fois : les requetes qui expirent ensemble partagent le meme appel.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" })
      .then((res) => res.ok, () => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);
  // Un seul renouvellement puis une seule nouvelle tentative : pas de boucle possible.
  if (res.status === 401 && (await refreshSession())) res = await send(path, init);
  if (res.status === 401) {
    // Navigation complete voulue : elle vide tout l'etat client apres une session expiree.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (typeof window !== "undefined") window.location.assign("/login");
    throw await toError(res);
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiGet = <T>(path: string) => apiFetch<T>(path, { method: "GET" });

export const getHealth = () => apiGet<unknown>("/health");