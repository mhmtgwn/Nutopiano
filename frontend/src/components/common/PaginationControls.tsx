import Link from 'next/link';

export default function PaginationControls({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  const current = Math.max(1, Number(page) || 1);
  const total = Math.max(1, Number(totalPages) || 1);

  if (total <= 1) return null;

  const prevDisabled = current <= 1;
  const nextDisabled = current >= total;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <Link
        href={prevDisabled ? buildHref(1) : buildHref(current - 1)}
        aria-disabled={prevDisabled}
        className={`inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border px-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
          prevDisabled
            ? 'cursor-not-allowed border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--neutral-400)]'
            : 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
        }`}
        onClick={(e) => {
          if (prevDisabled) e.preventDefault();
        }}
      >
        Önceki
      </Link>

      <div className="text-xs font-semibold text-[var(--neutral-600)]">
        Sayfa {current} / {total}
      </div>

      <Link
        href={nextDisabled ? buildHref(total) : buildHref(current + 1)}
        aria-disabled={nextDisabled}
        className={`inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border px-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
          nextDisabled
            ? 'cursor-not-allowed border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--neutral-400)]'
            : 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
        }`}
        onClick={(e) => {
          if (nextDisabled) e.preventDefault();
        }}
      >
        Sonraki
      </Link>
    </div>
  );
}
