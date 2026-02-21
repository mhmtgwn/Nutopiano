import Link from 'next/link';
import { ArrowUpRight, Landmark, Wallet } from 'lucide-react';

export default function AdminFinanceOverviewPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Finans
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Finans Merkezi
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Komisyon ve payout süreçlerini buradan yönetin.
            </p>
          </div>
          <Link
            href="/admin/finance/payouts"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Payouts <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/finance/payouts"
          className="group rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6 transition hover:border-[var(--neutral-300)]"
        >
          <Landmark className="h-5 w-5 text-[var(--primary-800)]/70" />
          <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">
            Payout talepleri
          </h2>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">
            Bekleyen talepleri onaylayın, EFT sonrası tamamlayın.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]">
            Listeyi aç <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <Wallet className="h-5 w-5 text-[var(--primary-800)]/70" />
          <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">
            Komisyon özeti
          </h2>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">
            Bu ekran M4 kapsamında metriklerle doldurulacak.
          </p>
        </div>
      </section>
    </div>
  );
}
