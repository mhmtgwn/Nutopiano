'use client';

type RiskScoreBadgeProps = {
  score: number;
  label?: string;
};

const resolveColor = (score: number) => {
  if (score >= 75) return 'border-red-200 bg-red-50 text-red-700';
  if (score >= 45) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

const resolveLevel = (score: number) => {
  if (score >= 75) return 'Yüksek';
  if (score >= 45) return 'Orta';
  return 'Düşük';
};

export default function RiskScoreBadge({
  score,
  label = 'Risk Score',
}: RiskScoreBadgeProps) {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const level = resolveLevel(normalized);
  const colorClass = resolveColor(normalized);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${colorClass}`}
      title={`${label}: ${normalized}/100 (${level})`}
    >
      <span>{label}</span>
      <span>
        {normalized}/100 ({level})
      </span>
    </div>
  );
}
