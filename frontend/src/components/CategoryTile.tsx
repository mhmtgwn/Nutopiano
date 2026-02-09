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
      className="group flex flex-col justify-between rounded-3xl border border-[#E0D7C6] bg-white/85 p-5 shadow-[0_16px_40px_rgba(26,60,52,0.08)] transition hover:-translate-y-1"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-serif text-[#1A3C34]">
            {category.name}
          </h3>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1A3C34]/20 text-[#1A3C34] transition group-hover:bg-[#1A3C34] group-hover:text-white">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        {category.description && (
          <p className="line-clamp-2 text-sm text-[#5C5C5C]">
            {category.description}
          </p>
        )}
      </div>
      <span className="mt-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
        Koleksiyonu keşfet
      </span>
    </Link>
  );
}
