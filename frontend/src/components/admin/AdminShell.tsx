'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronDown, ChevronRight, CircleHelp, LogOut, Menu, Search, Store, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createPanelAccessManifest, getAdminPanelSections } from '@/lib/panel-access';
import { getPanelLabelByRole } from '@/lib/role-routing';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/userSlice';

interface AdminShellProps {
  children: ReactNode;
  basePath?: string;
}

type NotifRow = {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const manifest = useMemo(() => createPanelAccessManifest(user), [user]);
  const panelLabel = getPanelLabelByRole(user?.role);
  const navSections = useMemo(() => getAdminPanelSections(manifest), [manifest]);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === href : pathname.startsWith(href);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    dispatch(logout());
    router.push('/login');
  };

  const renderSidebarNav = () => (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-[var(--neutral-200)] px-5 py-5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary-800)] text-sm font-bold text-white">
          {user?.name?.charAt(0)?.toUpperCase() ?? 'N'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-none text-[var(--primary-800)]">
            {user?.name ?? 'Nutopiano Kullanici'}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--neutral-600)]">{panelLabel}</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {navSections.map((section) => {
          const isCollapsed = collapsedSections[section.title] ?? false;
          const SectionIcon = section.icon;
          const hasActiveItem = section.items.some((item) => isActive(item.href));

          return (
            <div key={section.title}>
              {section.collapsible ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                    hasActiveItem
                      ? 'text-[var(--primary-700)]'
                      : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
                  }`}
                >
                  {SectionIcon ? <SectionIcon className="h-3.5 w-3.5 flex-shrink-0" /> : null}
                  <span className="flex-1 text-left">{section.title}</span>
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-60" />
                  ) : (
                    <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-60" />
                  )}
                </button>
              ) : (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  {section.title}
                </p>
              )}

              {!isCollapsed ? (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                          active
                            ? 'bg-[#F4F4F3] text-[var(--primary-800)]'
                            : 'text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]'
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge ? (
                          <span className="rounded-full bg-[var(--neutral-100)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--neutral-600)]">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-[var(--neutral-200)] px-3 py-3">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]"
        >
          <Store className="h-4 w-4 flex-shrink-0" />
          Magazaya Don
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium text-[var(--neutral-700)] transition hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Cikis Yap
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-[var(--primary-800)]">
      <header className="sticky top-0 z-30 border-b border-[var(--neutral-200)] bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--neutral-200)] text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)] lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href={manifest.primaryPanel?.href ?? '/admin'} className="flex items-center gap-3">
            <span className="text-4xl font-serif font-semibold leading-none text-[var(--accent-900)]">
              Nutopiano
            </span>
            <span className="hidden border-l border-[var(--neutral-300)] pl-3 text-sm font-semibold text-[var(--neutral-700)] sm:block">
              {panelLabel}
            </span>
          </Link>

          <div className="hidden items-center gap-2 text-xs font-medium text-[var(--neutral-500)] lg:flex">
            <span>Yonetim</span>
            <span className="h-1 w-1 rounded-full bg-[var(--neutral-400)]" />
            <span>{manifest.role === 'SUPER_ADMIN' ? 'Platform Kontrol' : 'Operasyon Kontrol'}</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/orders"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neutral-200)] text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]"
              aria-label="Siparislerde ara"
            >
              <Search className="h-4 w-4" />
            </Link>
            <NotificationBell />
            <Link
              href="/admin/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neutral-200)] text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]"
              aria-label="Ayarlar"
            >
              <CircleHelp className="h-4 w-4" />
            </Link>
            {user ? (
              <div className="ml-1 flex items-center gap-2.5 rounded-full border border-[var(--neutral-200)] bg-white px-2 py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-800)] text-xs font-bold text-white">
                  {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                <div className="hidden md:block">
                  <p className="leading-none text-[13px] font-semibold text-[var(--primary-800)]">
                    {user.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--neutral-600)]">{user.role}</p>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--neutral-200)] px-3 text-[12px] font-medium text-[var(--neutral-700)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cikis</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] overflow-hidden">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[260px] flex-shrink-0 overflow-hidden border-r border-[var(--neutral-200)] lg:flex lg:flex-col">
          {renderSidebarNav()}
        </aside>

        <main className="flex-1 overflow-y-auto bg-white">
          <div className="mx-auto w-full max-w-[1160px] px-4 py-6 md:px-6 md:py-8">{children}</div>
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-hidden border-r border-[var(--neutral-200)] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--neutral-200)] px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-serif font-semibold text-[var(--accent-900)]">
                  Nutopiano
                </span>
                <span className="text-[12px] font-medium text-[var(--neutral-600)]">{panelLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--neutral-500)] transition hover:bg-white hover:text-[var(--primary-800)]"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{renderSidebarNav()}</div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifs } = useQuery<{ data: NotifRow[] }>({
    queryKey: ['admin-notif-bell'],
    queryFn: async () => {
      try {
        return (await api.get('/notifications', { params: { pageSize: 8 } })).data;
      } catch {
        return { data: [] };
      }
    },
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notif-bell'] }),
  });

  const rows = notifs?.data ?? [];
  const unreadCount = rows.filter((row) => !row.isRead).length;

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const typeColor: Record<string, string> = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neutral-200)] text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]"
        aria-label="Bildirimler"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-[var(--neutral-200)] bg-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-[var(--neutral-100)] px-4 py-3">
            <h4 className="text-sm font-semibold text-[var(--primary-800)]">Bildirimler</h4>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="text-[11px] font-medium text-blue-600 hover:underline"
              >
                Tumunu okundu isle
              </button>
            ) : null}
          </div>

          <div className="max-h-[320px] divide-y divide-[var(--neutral-100)] overflow-y-auto">
            {rows.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--neutral-500)]">
                Bildirim yok
              </div>
            ) : (
              rows.map((row) => (
                <div
                  key={row.id}
                  className={`flex items-start gap-3 px-4 py-3 transition ${!row.isRead ? 'bg-blue-50/40' : 'hover:bg-[var(--neutral-50)]'}`}
                >
                  <span
                    className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${typeColor[row.type] ?? 'bg-gray-400'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[13px] leading-snug ${!row.isRead ? 'font-semibold text-[var(--primary-800)]' : 'font-medium text-[var(--neutral-700)]'}`}
                    >
                      {row.title}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--neutral-500)]">
                      {row.message}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--neutral-400)]">
                      {new Date(row.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[var(--neutral-100)] px-4 py-2.5">
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-[12px] font-semibold text-[var(--primary-700)] hover:underline"
            >
              Tum Bildirimleri Gor
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

