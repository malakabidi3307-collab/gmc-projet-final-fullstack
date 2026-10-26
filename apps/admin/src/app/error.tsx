"use client";

import { ErrorState } from "@/components/ifag/state-views";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return <main className="grid min-h-svh place-items-center p-6"><ErrorState title="Une erreur est survenue" message={error.message} onRetry={reset} /></main>;
}
