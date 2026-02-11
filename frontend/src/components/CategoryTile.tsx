import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export interface CategoryTileProps {
  category: {
    slug: string;
    name: string;
    description?: string;
  };
}

export default function CategoryTile({ category }: CategoryTileProps) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex flex-col justify-between rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white/85 p-5 shadow-[var(--shadow-lg)] transition-[transform,shadow] hover:-translate-y-1 hover:shadow-[var(--shadow-xl)]"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-serif text-[var(--primary-800)]">
            {category.name}
          </h3>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--primary-800)]/20 text-[var(--primary-800)] transition-colors group-hover:bg-[var(--primary-800)] group-hover:text-white">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        {category.description && (
          <p className="line-clamp-2 text-sm text-[var(--neutral-600)]">
            {category.description}
          </p>
        )}
      </div>
      <span className="mt-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
        Koleksiyonu keşfet
      </span>
    </Link>
  );
}
