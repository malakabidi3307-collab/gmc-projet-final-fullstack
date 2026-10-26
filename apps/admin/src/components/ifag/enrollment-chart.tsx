// Courbe SVG simple (aucune dépendance). Pour un graphique avancé : `pnpm dlx shadcn@latest add chart`.
export function EnrollmentChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values), w = 520, h = 160, pad = 20;
  const pts = values.map((v, i) => [pad + (i * (w - 2 * pad)) / (values.length - 1), h - pad - (v / max) * (h - 2 * pad)]);
  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} role="img" aria-label={`Inscriptions : ${values.join(", ")}`} className="h-auto w-full">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--primary)" strokeWidth="3" />
      {pts.map(([x, y], i) => (
        <g key={labels[i]}>
          <circle cx={x} cy={y} r="4" fill="var(--primary)" />
          <text x={x} y={h + 14} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">{labels[i]}</text>
        </g>
      ))}
    </svg>
  );
}
