'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileCheck,
  Home,
  Landmark,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Package,
  RotateCcw,
  Settings,
  Shield,
  ShieldAlert,
  Store,
  Tags,
  Truck,
  UserCheck,
  UserCog,
  X,
  Zap,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { getPanelLabelByRole } from '@/lib/role-routing';
import { hasAllCapabilities, hasAnyCapability, type AppCapability } from '@/lib/capabilities';
import api from '@/services/api';
import { logout } from '@/store/userSlice';

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
  badge?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const createNavSections = (basePath: string): NavSection[] => [
  {
    title: 'Ana Sayfa',
    items: [
      { label: 'Genel Bakış', href: `${basePath}`, icon: Home },
    ],
  },
  {
    title: 'Kullanıcılar',
    items: [
      { label: 'Kullanıcılar', href: `${basePath}/users`, icon: UserCog, requiredCapabilities: ['MANAGE_SELLERS'] },
      { label: 'Müşteriler', href: `${basePath}/customers`, icon: UserCheck },
      { label: 'Satıcılar', href: `${basePath}/sellers`, icon: Store, requiredCapabilities: ['MANAGE_SELLERS'] },
      { label: 'Başvurular', href: `${basePath}/sellers/applications`, icon: FileCheck, requiredCapabilities: ['MANAGE_SELLERS'] },
      { label: 'Planlar', href: `${basePath}/plans`, icon: Zap },
    ],
  },
  {
    title: 'Mağaza',
    items: [
      { label: 'Ürünler', href: `${basePath}/products`, icon: Package },
      { label: 'Katalog', href: `${basePath}/catalog`, icon: Package },
      { label: 'Kategoriler', href: `${basePath}/categories`, icon: Tags },
    ],
  },
  {
    title: 'Operasyon',
    items: [
      { label: 'Siparişler', href: `${basePath}/orders`, icon: ClipboardList },
      { label: 'İadeler', href: `${basePath}/finance/refunds`, icon: RotateCcw },
      { label: 'Kapıya Hizmet', href: `${basePath}/services`, icon: Truck },
      { label: 'Ödemeler', href: `${basePath}/payments`, icon: CreditCard },
    ],
  },
  {
    title: 'Finans',
    items: [
      { label: 'Finans Genel', href: `${basePath}/finance`, icon: Landmark, requiredCapabilities: ['VIEW_FINANCE'] },
      { label: 'Ledger', href: `${basePath}/finance/ledger`, icon: Landmark, requiredCapabilities: ['VIEW_FINANCE'] },
      { label: 'Cüzdanlar', href: `${basePath}/finance/wallets`, icon: Landmark, requiredCapabilities: ['VIEW_FINANCE'] },
      { label: 'Payout', href: `${basePath}/finance/payouts`, icon: Landmark, requiredCapabilities: ['VIEW_FINANCE'] },
      { label: 'Fiyat Uyuşmazlık', href: `${basePath}/finance/mismatch-monitor`, icon: AlertTriangle, requiredCapabilities: ['VIEW_FINANCE'] },
    ],
  },
  {
    title: 'Risk & Sistem',
    items: [
      { label: 'Risk Kontrolü', href: `${basePath}/risk-control`, icon: ShieldAlert, requireAnyCapabilities: ['VIEW_AUDIT', 'VIEW_OUTBOX'] },
      { label: 'Destek Modu', href: `${basePath}/support`, icon: Shield, requiredCapabilities: ['VIEW_SUPPORT_MODE'] },
      { label: 'SMTP', href: `${basePath}/smtp`, icon: Mail },
      { label: 'SMS', href: `${basePath}/sms`, icon: MessageCircle },
      { label: 'Raporlar', href: `${basePath}/reports`, icon: BarChart3, requiredCapabilities: ['VIEW_REPORTS'] },
      { label: 'Ayarlar', href: `${basePath}/settings`, icon: Settings },
    ],
  },
];

export default function AdminShell({ children, basePath = '/admin' }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.user.user);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const panelLabel = getPanelLabelByRole(user?.role);

  const navSections = useMemo(() => {
    const raw = createNavSections(basePath);
    return raw
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.requiredCapabilities && !hasAllCapabilities(user?.role, item.requiredCapabilities)) return false;
          if (item.requireAnyCapabilities && !hasAnyCapability(user?.role, item.requireAnyCapabilities)) return false;
          return true;
        }),
      }))
      .filter((s) => s.items.length > 0);
  }, [basePath, user?.role]);

  const isActive = (href: string) =>
    href === basePath ? pathname === href : pathname.startsWith(href);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    dispatch(logout());
    router.push('/login');
  };

  const sidebarColor = isSuperAdmin ? '#11244e' : '#123228';
  const accentColor = isSuperAdmin ? '#60A5FA' : '#D4B06F';

  const SidebarNav = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/[0.1] px-5 py-5">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: accentColor }}
        >
          N
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] leading-none text-white/40">Nutopiano</p>
          <p className="mt-1 truncate text-[13px] font-semibold leading-none text-white">{panelLabel}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium
                      transition-all duration-150
                      ${active
                        ? 'bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]'
                        : 'text-white/65 hover:bg-white/[0.08] hover:text-white/90'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                        {item.badge}
                      </span>
                    ) : null}
                    {active && (
                      <div
                        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="space-y-1 border-t border-white/[0.1] px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-medium text-white/55 transition hover:bg-white/[0.08] hover:text-white"
        >
          <Store className="h-4 w-4 flex-shrink-0" />
          Mağazaya Dön
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-medium text-white/55 transition hover:bg-red-500/10 hover:text-red-200"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--brand-cream)] text-[#16362f]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#d8dfd4] bg-white/90 px-4 shadow-[var(--shadow-sm)] backdrop-blur md:px-6">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9dfd5] text-[#53746b] transition hover:bg-[#f4f7f2] lg:hidden"
          aria-label="Menü"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile Logo */}
        <div className="flex lg:hidden items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: sidebarColor }}
          >
            N
          </div>
          <span className="text-sm font-semibold text-[#16362f]">{panelLabel}</span>
        </div>

        {/* Breadcrumb Desktop */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-[#658076]">
          <span className="font-semibold text-[#16362f]">{panelLabel}</span>
          <ChevronRight className="h-4 w-4 text-[#c5cec2]" />
          <span>Dashboard</span>
        </div>

        <div className="flex-1" />

        {/* User */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: sidebarColor }}
              >
                {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div className="hidden md:block">
                <p className="leading-none text-[13px] font-semibold text-[#16362f]">{user.name}</p>
                <p className="mt-0.5 text-[11px] text-[#6a857b]">{user.role}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#d8dfd4] px-3 text-[12px] font-medium text-[#5a766c] transition hover:border-[#d9b2b2] hover:bg-[#fff4f4] hover:text-[#9a2e2e]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </header>

      {/* Layout */}
      <div className="flex min-h-[calc(100vh-4rem)] overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[272px] flex-shrink-0 overflow-hidden lg:flex lg:flex-col"
          style={{
            background: `linear-gradient(180deg, ${sidebarColor} 0%, #0d251e 100%)`,
          }}
        >
          <SidebarNav />
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-transparent">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
            <div className="surface-panel p-4 md:p-6">
            {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-hidden shadow-2xl"
            style={{
              background: `linear-gradient(180deg, ${sidebarColor} 0%, #0d251e 100%)`,
            }}
          >
            <div className="flex items-center justify-between border-b border-white/[0.1] px-4 py-4">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  N
                </div>
                <span className="text-[13px] font-semibold text-white">{panelLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarNav />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
