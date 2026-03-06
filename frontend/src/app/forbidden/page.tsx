'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Home, LayoutDashboard } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
        <section className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-amber-50 px-6 py-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            403 Forbidden
          </div>
          <h1 className="mt-3 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
            Bu alana erisiminiz yok
          </h1>
          <p className="mt-3 text-sm text-[var(--neutral-600)]">
            Rol veya yetki kapsaminiz bu rotayi acmaya uygun degil. Profil veya panel kapisi
            uzerinden yetkili oldugunuz modulleri kullanabilirsiniz.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/panel"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-800)] hover:bg-[var(--neutral-50)]"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Panel Kapisi
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-800)] hover:bg-[var(--neutral-50)]"
            >
              <Home className="h-3.5 w-3.5" />
              Ana Sayfa
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
