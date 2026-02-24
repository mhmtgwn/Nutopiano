'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  ClipboardList,
  CreditCard,
  Home,
  Landmark,
  Mail,
  Menu,
  MessageCircle,
  Package,
  Settings,
  Shield,
  Tags,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAppSelector } from '@/store';
import { getPanelLabelByRole } from '@/lib/role-routing';
import { hasAllCapabilities, hasAnyCapability, type AppCapability } from '@/lib/capabilities';

interface AdminShellProps {
  children: ReactNode;
  basePath?: string;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredCapabilities?: AppCapability[];
  requireAnyCapabilities?: AppCapability[];
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const createNavSections = (basePath: string): NavSection[] => {
  const isPlatform = basePath === '/platform';

  const sections: NavSection[] = [
    {
      title: 'Merkez',
      items: [
        { label: 'Genel Bakış', href: `${basePath}`, icon: Home },
        {
          label: 'Kullanıcılar',
          href: `${basePath}/users`,
          icon: Users,
          requiredCapabilities: ['MANAGE_SELLERS'],
        },
        { label: 'Müşteriler', href: `${basePath}/customers`, icon: Users },
        {
          label: 'Satıcılar',
          href: `${basePath}/sellers`,
          icon: Users,
          requiredCapabilities: ['MANAGE_SELLERS'],
        },
        {
          label: 'Satıcı Başvuru',
          href: `${basePath}/sellers/applications`,
          icon: Users,
          requiredCapabilities: ['MANAGE_SELLERS'],
        },
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
      ],
    },
    {
      title: 'Finance',
      items: [
        {
          label: 'Overview',
          href: `${basePath}/finance`,
          icon: Landmark,
          requiredCapabilities: ['VIEW_FINANCE'],
        },
        {
          label: 'Ledger',
          href: `${basePath}/finance/ledger`,
          icon: Landmark,
          requiredCapabilities: ['VIEW_FINANCE'],
        },
        {
          label: 'Wallets',
          href: `${basePath}/finance/wallets`,
          icon: Landmark,
          requiredCapabilities: ['VIEW_FINANCE'],
        },
        {
          label: 'Payouts',
          href: `${basePath}/finance/payouts`,
          icon: Landmark,
          requiredCapabilities: ['VIEW_FINANCE'],
        },
        {
          label: 'Refunds',
          href: `${basePath}/finance/refunds`,
          icon: Landmark,
          requiredCapabilities: ['VIEW_FINANCE'],
        },
        {
          label: 'Mismatch Monitor',
          href: `${basePath}/finance/mismatch-monitor`,
          icon: AlertTriangle,
          requiredCapabilities: ['VIEW_FINANCE'],
        },
      ],
    },
    {
      title: 'Risk',
      items: [
        {
          label: 'Risk & Control',
          href: `${basePath}/risk-control`,
          icon: AlertTriangle,
          requireAnyCapabilities: ['VIEW_AUDIT', 'VIEW_OUTBOX'],
        },
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
        {
          label: 'Raporlar',
          href: `${basePath}/reports`,
          icon: ClipboardList,
          requiredCapabilities: ['VIEW_REPORTS'],
        },
        { label: 'Genel Ayarlar', href: `${basePath}/settings`, icon: Settings },
      ],
    },
  ];

  if (isPlatform) {
    sections.push({
      title: 'Destek',
      items: [
        {
          label: 'Support Mode',
          href: `${basePath}/support`,
          icon: Shield,
          requiredCapabilities: ['VIEW_SUPPORT_MODE'],
        },
      ],
    });
  }

  return sections;
};

export default function AdminShell({ children, basePath = '/admin' }: AdminShellProps) {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user.user);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navSections = useMemo(() => {
    const raw = createNavSections(basePath);
    const role = user?.role;
    return raw
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (
            item.requiredCapabilities &&
            !hasAllCapabilities(role, item.requiredCapabilities)
          ) {
            return false;
          }
          if (
            item.requireAnyCapabilities &&
            !hasAnyCapability(role, item.requireAnyCapabilities)
          ) {
            return false;
          }
          return true;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [basePath, user?.role]);
  const panelLabel = getPanelLabelByRole(user?.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const panelModeLabel = isSuperAdmin ? 'Platform Panel' : 'Admin Panel';
  const panelDescription = isSuperAdmin
    ? 'Satıcı, kullanıcı, plan ve operasyon akışlarını platform genelinde yönetin.'
    : 'Ürün, sipariş ve ödeme akışlarını işletme düzeyinde yönetin.';
  const activeNavClass = isSuperAdmin
    ? 'border border-[#173A74]/20 bg-[#173A74] text-white'
    : 'border border-[var(--primary-800)]/20 bg-[var(--primary-800)] text-white';
  const panelBadgeClass = isSuperAdmin
    ? 'rounded-full border border-[#173A74]/25 bg-[#ECF2FF] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#173A74] md:px-4'
    : 'rounded-full border border-[var(--neutral-200)] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] md:px-4';

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
                {panelLabel}
              </h2>
              <p className="mt-2 text-xs text-[var(--neutral-600)]">
                {panelDescription}
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
                              ? activeNavClass
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
                    {panelModeLabel}
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
                  <div className={panelBadgeClass}>
                    {panelLabel}
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
                                  ? activeNavClass
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
