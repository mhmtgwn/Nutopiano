'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  CreditCard,
  Home,
  Landmark,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Settings,
  Tags,
  Truck,
  Users,
  X,
} from 'lucide-react';

interface AdminShellProps {
  children: ReactNode;
  basePath?: string;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const createNavSections = (basePath: string): NavSection[] => [
  {
    title: 'Merkez',
    items: [
      { label: 'Genel Bakış', href: `${basePath}`, icon: Home },
      { label: 'Kullanıcılar', href: `${basePath}/users`, icon: Users },
      { label: 'Müşteriler', href: `${basePath}/customers`, icon: Users },
      { label: 'Satıcılar', href: `${basePath}/sellers`, icon: Users },
      { label: 'Satıcı Başvuru', href: `${basePath}/sellers/applications`, icon: Users },
      { label: 'Planlar', href: `${basePath}/plans`, icon: CreditCard },
    ],
  },
  {
    title: 'Katalog',
    items: [
      { label: 'Katalog', href: `${basePath}/catalog`, icon: Package },
      { label: 'Ürünler', href: `${basePath}/products`, icon: Package },
      { label: 'Kategoriler', href: `${basePath}/categories`, icon: Tags },
    ],
  },
  {
    title: 'Sipariş',
    items: [
      { label: 'Siparişler', href: `${basePath}/orders`, icon: ClipboardList },
      { label: 'Kapıya Hizmet', href: `${basePath}/services`, icon: Truck },
      { label: 'Ödeme Ayarları', href: `${basePath}/payments`, icon: CreditCard },
      { label: 'Finans', href: `${basePath}/finance`, icon: Landmark },
    ],
  },
  {
    title: 'Bildirim',
    items: [
      { label: 'SMTP', href: `${basePath}/smtp`, icon: Mail },
      { label: 'SMS', href: `${basePath}/sms`, icon: MessageCircle },
    ],
  },
  {
    title: 'Ayarlar',
    items: [
      { label: 'Raporlar', href: `${basePath}/reports`, icon: ClipboardList },
      { label: 'Genel Ayarlar', href: `${basePath}/settings`, icon: Settings },
    ],
  },
];

export default function AdminShell({ children, basePath = '/admin' }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navSections = useMemo(() => createNavSections(basePath), [basePath]);

  const isActive = (href: string) =>
    href === basePath ? pathname === href : pathname.startsWith(href);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden space-y-6 lg:block">
            <div className="border-b border-[var(--neutral-200)] pb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                Nutopiano Admin
              </p>
              <h2 className="mt-2 text-xl font-serif text-[var(--primary-800)]">
                Yönetim Merkezi
              </h2>
              <p className="mt-2 text-xs text-[var(--neutral-600)]">
                Ürün, sipariş ve ödeme akışlarını tek panelden yönetin.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
              >
                Mağazaya dön
              </Link>
            </div>

            <nav className="space-y-5">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                    {section.title}
                  </p>
                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                            active
                              ? 'border border-[var(--primary-800)]/20 bg-[var(--primary-800)] text-white'
                              : 'border border-transparent text-[var(--primary-800)]/70 hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-50)]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            <header className="border-b border-[var(--neutral-200)] pb-4 lg:pb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="hidden text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] lg:block">
                    Admin Panel
                  </p>
                  <h1 className="mt-2 hidden text-3xl font-serif text-[var(--primary-800)] md:text-4xl lg:block">
                    Kontrol Paneli
                  </h1>
                  <p className="mt-2 hidden text-sm text-[var(--neutral-600)] lg:block">
                    Sipariş, ödeme, kapıya hizmet ve bildirim akışlarını yönetin.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)] lg:hidden"
                    aria-label="Menüyü aç"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <div className="rounded-full border border-[var(--neutral-200)] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] md:px-4">
                    Yönetici erişimi
                  </div>
                </div>
              </div>
            </header>

            <main className="space-y-6">{children}</main>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Menüyü kapat"
              onClick={() => setMobileNavOpen(false)}
              className="absolute inset-0 bg-black/30"
            />
            <div className="absolute left-0 top-0 h-full w-[86vw] max-w-[340px] bg-white shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between border-b border-[var(--neutral-200)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                  Nutopiano Admin
                </p>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
                  aria-label="Kapat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-4 py-5">
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
                >
                  Mağazaya dön
                </Link>

                <nav className="mt-6 space-y-5">
                  {navSections.map((section) => (
                    <div key={section.title} className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
                        {section.title}
                      </p>
                      <div className="space-y-2">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                                active
                                  ? 'border border-[var(--primary-800)]/20 bg-[var(--primary-800)] text-white'
                                  : 'border border-transparent text-[var(--primary-800)]/70 hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-50)]'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
