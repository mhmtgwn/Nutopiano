'use client';

import type { ComponentType, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Package,
  ScrollText,
  Store,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { getPanelLabelByRole } from '@/lib/role-routing';
import { hasAllCapabilities, type AppCapability } from '@/lib/capabilities';
import api from '@/services/api';
import { logout } from '@/store/userSlice';

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
  { label: 'Siparişler', href: '/dashboard/orders', icon: ScrollText },
  { label: 'Ürünler', href: '/dashboard/products', icon: Package },
  { label: 'POS', href: '/pos', icon: CreditCard, requiredCapabilities: ['USE_POS'] },
  { label: 'Müşteriler', href: '/dashboard/customers', icon: Users },
  { label: 'Raporlar', href: '/dashboard/reports', icon: BarChart3 },
  {
    label: 'Ödemeler',
    href: '/dashboard/finance',
    icon: Wallet,
    requiredCapabilities: ['VIEW_FINANCE'],
  },
];

const staffNavItems: SellerNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Siparişler', href: '/dashboard/orders', icon: ScrollText },
  { label: 'POS', href: '/pos', icon: CreditCard, requiredCapabilities: ['USE_POS'] },
];

function SidebarContent({
  navItems,
  isActive,
  activeNavClass,
  panelLabel,
  panelDescription,
}: {
  navItems: SellerNavItem[];
  isActive: (href: string) => boolean;
  activeNavClass: string;
  panelLabel: string;
  panelDescription: string;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Sidebar Header */}
      <div className="px-5 py-6 border-b border-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
          Nutopiano
        </p>
        <h2 className="mt-1.5 text-base font-semibold text-white">
          {panelLabel}
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-white/50">
          {panelDescription}
        </p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${active
                ? activeNavClass
                : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                }`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Mağazaya Dön */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium text-white/50 hover:bg-white/8 hover:text-white/80 transition-all duration-150"
        >
          <Store className="h-4 w-4 flex-shrink-0" />
          Mağazaya dön
        </Link>
      </div>
    </div>
  );
}

export default function SellerShell({ children }: SellerShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
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
    ? 'Dashboard, sipariş ve POS akışına erişiminiz var.'
    : 'Sipariş, ürün, POS, müşteri, rapor ve ödeme akışlarını yönetin.';

  // Staff: amber/kahve sidebar; Seller: koyu yeşil sidebar
  const sidebarBg = isStaff ? 'bg-[#2C1810]' : 'bg-[#0F2420]';
  const activeNavClass = isStaff
    ? 'bg-white/15 text-white font-semibold'
    : 'bg-white/12 text-white font-semibold';
  const topBarAccent = isStaff ? '#A0621A' : '#1A6B4E';

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    dispatch(logout());
    router.push('/login');
  };

  const sidebarProps = {
    navItems,
    isActive,
    activeNavClass,
    panelLabel,
    panelDescription,
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col">
      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 z-30 sticky top-0">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: topBarAccent }}
          >
            N
          </div>
          <div className="hidden sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              Nutopiano
            </p>
            <p className="text-[12px] font-semibold text-gray-700 leading-none mt-0.5">
              {isStaff ? 'Personel Paneli' : 'Satıcı Paneli'}
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 ml-2 text-gray-400">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[12px] font-medium text-gray-600">{panelLabel}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User Info + Logout */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-gray-600">
                  {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </span>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-[12px] font-semibold text-gray-700 leading-none">{user.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{user.role}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Desktop */}
        <aside className={`hidden lg:flex flex-col w-[260px] flex-shrink-0 ${sidebarBg} sticky top-14 h-[calc(100vh-3.5rem)]`}>
          <SidebarContent {...sidebarProps} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className={`absolute left-0 top-0 h-full w-[280px] ${sidebarBg} flex flex-col shadow-2xl`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-md flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ backgroundColor: topBarAccent }}
                >
                  N
                </div>
                <p className="text-[12px] font-semibold text-white">
                  {isStaff ? 'Personel Paneli' : 'Satıcı Paneli'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition"
                aria-label="Kapat"
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>
            <SidebarContent {...sidebarProps} />
          </div>
        </div>
      )}
    </div>
  );
}
