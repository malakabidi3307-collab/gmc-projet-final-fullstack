import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const initials = (name: string) => name.split(/[\s.]+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function PersonCell({ name, subtitle }: { name: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar><AvatarFallback>{initials(name)}</AvatarFallback></Avatar>
      <div className="leading-tight"><p className="font-medium">{name}</p>{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div>
    </div>
  );
}
