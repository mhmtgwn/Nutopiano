'use client';

import type { ComponentType, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Home,
  Package,
  CreditCard,
  Menu,
  ScrollText,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAppSelector } from '@/store';
import { getPanelLabelByRole } from '@/lib/role-routing';
import { hasAllCapabilities, type AppCapability } from '@/lib/capabilities';

interface SellerShellProps {
  children: ReactNode;
}

type SellerNavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  requiredCapabilities?: AppCapability[];
};

const sellerNavItems: SellerNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Orders', href: '/dashboard/orders', icon: ScrollText },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'POS', href: '/pos', icon: CreditCard, requiredCapabilities: ['USE_POS'] },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  {
    label: 'Payouts',
    href: '/dashboard/finance',
    icon: Wallet,
    requiredCapabilities: ['VIEW_FINANCE'],
  },
];

const staffNavItems: SellerNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Orders', href: '/dashboard/orders', icon: ScrollText },
  { label: 'POS', href: '/pos', icon: CreditCard, requiredCapabilities: ['USE_POS'] },
];

export default function SellerShell({ children }: SellerShellProps) {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user.user);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = useMemo(() => {
    const role = user?.role;
    const base = role === 'USER' ? staffNavItems : sellerNavItems;
    return base.filter(
      (item) =>
        !item.requiredCapabilities ||
        hasAllCapabilities(role, item.requiredCapabilities),
    );
  }, [user?.role]);

  const panelLabel = getPanelLabelByRole(user?.role);
  const isStaff = user?.role === 'USER';
  const panelDescription = isStaff
    ? 'Dashboard, order ve POS akisina erisiminiz var.'
    : 'Order, urun, POS, customer, report ve payout akislarini yonetin.';
  const activeNavClass = isStaff
    ? 'border border-[#7A4B00]/20 bg-[#7A4B00] text-white'
    : 'border border-[var(--primary-800)]/20 bg-[var(--primary-800)] text-white';
  const panelBadgeClass = isStaff
    ? 'rounded-full border border-[#7A4B00]/20 bg-[#FFF3DF] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7A4B00] md:px-4'
    : 'rounded-full border border-[var(--neutral-200)] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] md:px-4';

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

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
                Nutopiano Seller
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

            <nav className="space-y-2">
              {navItems.map((item) => {
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
            </nav>
          </aside>

          <div className="space-y-6">
            <header className="border-b border-[var(--neutral-200)] pb-4 lg:pb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="hidden text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)] lg:block">
                    Seller Panel
                  </p>
                  <h1 className="mt-2 hidden text-3xl font-serif text-[var(--primary-800)] md:text-4xl lg:block">
                    Dashboard
                  </h1>
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
                  Nutopiano Seller
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
                <nav className="space-y-2">
                  {navItems.map((item) => {
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
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

