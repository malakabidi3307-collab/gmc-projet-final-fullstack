interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

function messageFor(status: number, body: ApiErrorBody | null): string {
  if (status === 400) return "Veuillez renseigner un e-mail et un mot de passe valides.";
  if (status === 401) return "E-mail ou mot de passe incorrect.";
  if (status === 403) return "Ce compte n'a pas accès à l'administration.";
  if (status === 429) return "Trop de tentatives. Réessayez dans quelques instants.";
  if (status === 502) return "Le serveur est indisponible. Réessayez plus tard.";
  return body?.error?.message ?? "Connexion impossible. Réessayez.";
}

/** Connexion via le BFF Next.js : les cookies HttpOnly sont poses par la reponse, jamais lus par le JavaScript. */
export async function loginViaBff(creds: { email: string; password: string }): Promise<void> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(creds),
    credentials: "same-origin",
  });
  if (res.ok) return;
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  throw new Error(messageFor(res.status, body));
}

export async function logoutViaBff(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } finally {
    // Navigation complete voulue : elle vide tout l'etat client apres la deconnexion.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }
}