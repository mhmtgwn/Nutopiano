'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, LogOut, Menu, Store, X } from 'lucide-react';

import { createPanelAccessManifest, getSellerPanelSections } from '@/lib/panel-access';
import { getPanelLabelByRole } from '@/lib/role-routing';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/userSlice';

interface SellerShellProps {
  children: ReactNode;
}

function SidebarContent({
  sections,
  isActive,
  activeNavClass,
  panelLabel,
  panelDescription,
  onNavigate,
}: {
  sections: ReturnType<typeof getSellerPanelSections>;
  isActive: (href: string) => boolean;
  activeNavClass: string;
  panelLabel: string;
  panelDescription: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-white/10 px-5 py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
          Nutopiano
        </p>
        <h2 className="mt-1.5 text-base font-semibold text-white">{panelLabel}</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-white/50">{panelDescription}</p>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
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
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                      active ? activeNavClass : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active ? <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-60" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium text-white/50 transition-all duration-150 hover:bg-white/8 hover:text-white/80"
        >
          <Store className="h-4 w-4 flex-shrink-0" />
          Magazaya don
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
  const manifest = useMemo(() => createPanelAccessManifest(user), [user]);
  const sections = useMemo(() => getSellerPanelSections(manifest), [manifest]);
  const panelLabel = getPanelLabelByRole(user?.role);
  const isStaff = manifest.role === 'SELLER_STAFF';
  const isAdminView = manifest.role === 'SUPER_ADMIN' || manifest.role === 'ADMIN';
  const panelDescription = isStaff
    ? 'Atanan seller modulleri ve POS akislari burada gorunur.'
    : isAdminView
      ? 'Seller yuzeyini admin operasyon gorunumuyle yonetin.'
      : 'Siparis, urun, finans ve magaza akislarini tek bir yerden yonetin.';

  const sidebarBg = isStaff ? 'bg-[#2C1810]' : 'bg-[#0F2420]';
  const activeNavClass = isStaff
    ? 'bg-white/15 text-white font-semibold'
    : 'bg-white/12 text-white font-semibold';
  const topBarAccent = isStaff ? '#A0621A' : '#1A6B4E';

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

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
    sections,
    isActive,
    activeNavClass,
    panelLabel,
    panelDescription,
    onNavigate: () => setMobileNavOpen(false),
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F8]">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 lg:hidden"
          aria-label="Menuyu ac"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: topBarAccent }}
          >
            N
          </div>
          <div className="hidden sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              Nutopiano
            </p>
            <p className="mt-0.5 text-[12px] font-semibold leading-none text-gray-700">
              {isStaff ? 'Personel Paneli' : isAdminView ? 'Admin Operasyon' : 'Satici Paneli'}
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 text-gray-400 md:flex">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[12px] font-medium text-gray-600">{panelLabel}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100">
                <span className="text-[11px] font-semibold text-gray-600">
                  {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </span>
              </div>
              <div className="hidden text-right md:block">
                <p className="text-[12px] font-semibold leading-none text-gray-700">{user.name}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">{user.role}</p>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cikis</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[260px] flex-shrink-0 flex-col lg:flex ${sidebarBg}`}>
          <SidebarContent {...sidebarProps} />
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 md:px-6 md:py-8">{children}</div>
        </main>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menuyu kapat"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className={`absolute left-0 top-0 flex h-full w-[280px] flex-col shadow-2xl ${sidebarBg}`}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white"
                  style={{ backgroundColor: topBarAccent }}
                >
                  N
                </div>
                <p className="text-[12px] font-semibold text-white">
                  {isStaff ? 'Personel Paneli' : isAdminView ? 'Admin Operasyon' : 'Satici Paneli'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Kapat"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <SidebarContent {...sidebarProps} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

