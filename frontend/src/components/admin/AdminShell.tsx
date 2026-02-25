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

  const sidebarColor = isSuperAdmin ? '#0D1B40' : '#0F2420';
  const accentColor = isSuperAdmin ? '#3B82F6' : '#22C55E';

  const SidebarNav = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.08]">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          N
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 leading-none">Nutopiano</p>
          <p className="mt-1 text-[13px] font-semibold text-white leading-none truncate">{panelLabel}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
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
                      flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium
                      transition-all duration-150
                      ${active
                        ? 'bg-white/12 text-white'
                        : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && (
                      <div
                        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
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
      <div className="px-3 py-3 border-t border-white/[0.08] space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition-all"
        >
          <Store className="w-4 h-4 flex-shrink-0" />
          Mağazaya Dön
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 sticky top-0 z-30 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          aria-label="Menü"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile Logo */}
        <div className="flex lg:hidden items-center gap-2">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: sidebarColor }}
          >
            N
          </div>
          <span className="text-sm font-semibold text-gray-800">{panelLabel}</span>
        </div>

        {/* Breadcrumb Desktop */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{panelLabel}</span>
          <ChevronRight className="h-4 w-4 text-gray-300" />
          <span className="text-gray-400">Dashboard</span>
        </div>

        <div className="flex-1" />

        {/* User */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2.5">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: sidebarColor }}
              >
                {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div className="hidden md:block">
                <p className="text-[13px] font-semibold text-gray-800 leading-none">{user.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{user.role}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </header>

      {/* Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:flex flex-col w-[256px] flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden"
          style={{ backgroundColor: sidebarColor }}
        >
          <SidebarNav />
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
            {children}
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
            className="absolute left-0 top-0 h-full w-72 flex flex-col overflow-hidden shadow-2xl"
            style={{ backgroundColor: sidebarColor }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: accentColor }}
                >
                  N
                </div>
                <span className="text-[13px] font-semibold text-white">{panelLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
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
