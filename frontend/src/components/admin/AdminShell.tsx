'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  CreditCard,
  FileKey,
  Flag,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Store,
  TrendingDown,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  icon?: React.ComponentType<{ className?: string }>;
  collapsible?: boolean;
  items: NavItem[];
};

const createNavSections = (basePath: string): NavSection[] => {
  return [
    {
      title: 'Paneller',
      items: [
        { label: 'Admin Panel', href: '/admin', icon: LayoutDashboard },
        { label: 'Platform Panel', href: '/platform', icon: LayoutDashboard },
        { label: 'Satıcı Panel', href: '/dashboard', icon: Store },
        { label: 'POS Panel', href: '/pos', icon: CreditCard },
        { label: 'Hesabım', href: '/account/profile', icon: UserCheck },
      ],
    },
    {
      title: 'Business Operations',
      icon: Boxes,
      collapsible: true,
      items: [
        { label: 'Genel Bakış', href: `${basePath}`, icon: Home },
        { label: 'Satıcılar', href: `${basePath}/sellers`, icon: Store, requiredCapabilities: ['MANAGE_SELLERS'] },
        { label: 'Satıcı Başvuruları', href: `${basePath}/sellers/applications`, icon: ClipboardList, requiredCapabilities: ['MANAGE_SELLERS'] },
        { label: 'Satıcı Kullanıcıları', href: `${basePath}/sellers/staff`, icon: Users, requiredCapabilities: ['MANAGE_SELLERS'] },
        { label: 'Ürünler', href: `${basePath}/products`, icon: ClipboardList },
        { label: 'Kategoriler', href: `${basePath}/categories`, icon: BookOpen },
        { label: 'Katalog', href: `${basePath}/catalog`, icon: Boxes },
        { label: 'Siparişler', href: `${basePath}/orders`, icon: ClipboardList },
        { label: 'Müşteriler', href: `${basePath}/customers`, icon: Users },
      ],
    },
    {
      title: 'Financial Control',
      icon: Wallet,
      collapsible: true,
      items: [
        { label: 'Finans Özeti', href: `${basePath}/finance`, icon: CreditCard, requiredCapabilities: ['VIEW_FINANCE'] },
        { label: 'Ledger', href: `${basePath}/finance/ledger`, icon: BookOpen, requiredCapabilities: ['VIEW_FINANCE'] },
        { label: 'Cüzdanlar', href: `${basePath}/finance/wallets`, icon: Wallet, requiredCapabilities: ['VIEW_FINANCE'] },
        { label: 'Payout Talepleri', href: `${basePath}/finance/payouts`, icon: CreditCard, requiredCapabilities: ['MANAGE_PAYOUT'] },
        { label: 'İadeler', href: `${basePath}/finance/refunds`, icon: TrendingDown, requiredCapabilities: ['VIEW_FINANCE'] },
        { label: 'Uyumsuzluk', href: `${basePath}/finance/mismatch-monitor`, icon: Shield, requiredCapabilities: ['VIEW_FINANCE'] },
      ],
    },
    {
      title: 'Platform Governance',
      icon: ShieldCheck,
      collapsible: true,
      items: [
        { label: 'Kullanıcılar', href: `${basePath}/users`, icon: Users },
        { label: 'Roller & Yetkiler', href: `${basePath}/roles`, icon: ShieldCheck },
        { label: 'Yetki Grupları', href: `${basePath}/permission-groups`, icon: KeyRound },
        { label: 'Bildirimler', href: `${basePath}/notifications`, icon: Bell },
        { label: 'Feature Flags', href: `${basePath}/settings/feature-flags`, icon: Flag },
        { label: 'Audit Log', href: `${basePath}/audit`, icon: BookOpen, requiredCapabilities: ['VIEW_AUDIT'] },
        { label: 'Outbox', href: `${basePath}/audit/outbox`, icon: BookOpen, requiredCapabilities: ['VIEW_AUDIT'] },
        { label: 'Risk Kontrol', href: `${basePath}/risk-control`, icon: Shield, requiredCapabilities: ['VIEW_AUDIT'] },
        { label: 'Güvenlik Dashboard', href: `${basePath}/security`, icon: ShieldCheck, requiredCapabilities: ['VIEW_AUDIT'] },
        { label: 'Mail Sunucu', href: `${basePath}/smtp`, icon: Mail },
        { label: 'E-posta Şablonları', href: `${basePath}/smtp/templates`, icon: Mail },
        { label: 'SMS Ayarları', href: `${basePath}/sms`, icon: MessageSquare },
        { label: 'SMS Şablonları', href: `${basePath}/sms/templates`, icon: MessageSquare },
        { label: 'API Keys', href: `${basePath}/settings/api-keys`, icon: FileKey },
        { label: 'Config Snapshots', href: `${basePath}/settings/config-snapshots`, icon: Archive },
        { label: 'Planlar', href: `${basePath}/plans`, icon: BarChart3 },
        { label: 'Raporlar', href: `${basePath}/reports`, icon: BarChart3, requiredCapabilities: ['VIEW_REPORTS'] },
        { label: 'Ayarlar', href: `${basePath}/settings`, icon: Settings },
      ],
    },
  ];
};

export default function AdminShell({ children, basePath = '/admin' }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.user.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    dispatch(logout());
    router.push('/login');
  };

  const handleNavClick = () => setMobileOpen(false);

  const sidebarHighlight = '#f4f4f3';

  const renderSidebarNav = () => (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-[var(--neutral-200)] px-5 py-5">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary-800)] text-sm font-bold text-white"
        >
          {user?.name?.charAt(0)?.toUpperCase() ?? 'N'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-none text-[var(--primary-800)]">
            {user?.name ?? 'Nutopiano Kullanıcı'}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--neutral-600)]">{panelLabel}</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
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
                  className={`
                    flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.15em]
                    transition-colors duration-150
                    ${hasActiveItem
                      ? 'text-[var(--primary-700)]'
                      : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
                    }
                  `}
                >
                  {SectionIcon && <SectionIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span className="flex-1 text-left">{section.title}</span>
                  {isCollapsed
                    ? <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-60" />
                    : <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-60" />
                  }
                </button>
              ) : (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  {section.title}
                </p>
              )}

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                        className={`
                          flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium
                          transition-colors duration-150
                          ${active
                            ? 'text-[var(--primary-800)]'
                            : 'text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]'
                          }
                        `}
                        style={active ? { backgroundColor: sidebarHighlight } : undefined}
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
              )}
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-[var(--neutral-200)] px-3 py-3">
        <Link
          href="/"
          onClick={handleNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]"
        >
          <Store className="h-4 w-4 flex-shrink-0" />
          Mağazaya Dön
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium text-[var(--neutral-700)] transition hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Çıkış Yap
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
            aria-label="Menü"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href={basePath} className="flex items-center gap-3">
            <span className="text-4xl font-serif font-semibold leading-none text-[var(--accent-900)]">Nutopiano</span>
            <span className="hidden border-l border-[var(--neutral-300)] pl-3 text-sm font-semibold text-[var(--neutral-700)] sm:block">
              {panelLabel}
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-[var(--neutral-500)]">
            <span>Yönetim</span>
            <span className="h-1 w-1 rounded-full bg-[var(--neutral-400)]" />
            <span>{isSuperAdmin ? 'Platform Kontrol' : 'Operasyon Kontrol'}</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2.5">
            <Link
              href={`${basePath}/orders`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neutral-200)] text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]"
              aria-label="Siparişlerde ara"
            >
              <Search className="h-4 w-4" />
            </Link>
            {/* Notification Bell — interactive dropdown */}
            <NotificationBell basePath={basePath} />
            <Link
              href={`${basePath}/settings`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neutral-200)] text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]"
              aria-label="Ayarlar"
            >
              <CircleHelp className="h-4 w-4" />
            </Link>

            {user && (
              <div className="ml-1 flex items-center gap-2.5 rounded-full border border-[var(--neutral-200)] bg-white px-2 py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-800)] text-xs font-bold text-white">
                  {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                <div className="hidden md:block">
                  <p className="leading-none text-[13px] font-semibold text-[var(--primary-800)]">{user.name}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--neutral-600)]">{user.role}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--neutral-200)] px-3 text-[12px] font-medium text-[var(--neutral-700)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] overflow-hidden">
        <aside
          className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[260px] flex-shrink-0 overflow-hidden border-r border-[var(--neutral-200)] lg:flex lg:flex-col"
        >
          {renderSidebarNav()}
        </aside>

        <main className="flex-1 overflow-y-auto bg-white">
          <div className="mx-auto w-full max-w-[1160px] px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-hidden border-r border-[var(--neutral-200)] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--neutral-200)] px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-serif font-semibold text-[var(--accent-900)]">Nutopiano</span>
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
            <div className="flex-1 overflow-hidden">
              {renderSidebarNav()}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ─── NotificationBell ─── */
type NotifRow = {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

function NotificationBell({ basePath }: { basePath: string }) {
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
  const unreadCount = rows.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neutral-200)] text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]"
        aria-label="Bildirimler"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-[var(--neutral-200)] bg-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-[var(--neutral-100)] px-4 py-3">
            <h4 className="text-sm font-semibold text-[var(--primary-800)]">Bildirimler</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="text-[11px] font-medium text-blue-600 hover:underline"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="max-h-[320px] divide-y divide-[var(--neutral-100)] overflow-y-auto">
            {rows.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--neutral-500)]">
                Bildirim yok
              </div>
            ) : (
              rows.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition ${!n.isRead ? 'bg-blue-50/40' : 'hover:bg-[var(--neutral-50)]'}`}
                >
                  <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${typeColor[n.type] ?? 'bg-gray-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] leading-snug ${!n.isRead ? 'font-semibold text-[var(--primary-800)]' : 'font-medium text-[var(--neutral-700)]'}`}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--neutral-500)] line-clamp-1">{n.message}</p>
                    <p className="mt-1 text-[10px] text-[var(--neutral-400)]">
                      {new Date(n.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[var(--neutral-100)] px-4 py-2.5">
            <Link
              href={`${basePath}/notifications`}
              onClick={() => setOpen(false)}
              className="block text-center text-[12px] font-semibold text-[var(--primary-700)] hover:underline"
            >
              Tüm Bildirimleri Gör
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
