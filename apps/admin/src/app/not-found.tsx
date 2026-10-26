import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ifag/state-views";

export default function NotFound() {
  return <main className="grid min-h-svh place-items-center p-6"><EmptyState title="Page introuvable" description="La page demandÃ©e nâ€™existe pas ou a Ã©tÃ© dÃ©placÃ©e." action={<Button nativeButton={false} render={<Link href="/dashboard" />}>Retour au tableau de bord</Button>} /></main>;
}
