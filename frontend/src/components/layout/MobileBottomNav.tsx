'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShoppingBag,
  Store,
  User,
  UserCircle2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getBackofficeMenuLinks,
  getCustomerMenuLinks,
} from '@/lib/account-menu';
import { getPanelLabelByRole } from '@/lib/role-routing';
import { resolveUserPanelHome } from '@/lib/profile-session';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/userSlice';

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileBottomNav() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const totalQuantity = useAppSelector((state) => state.cart.totalQuantity);
  const user = useAppSelector((state) => state.user.user);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmedQuery = useMemo(() => searchValue.trim(), [searchValue]);
  const accountHref = user ? resolveUserPanelHome(user) : '/login';
  const accountLabel = user?.role === 'CUSTOMER' ? 'Hesap' : 'Panel';
  const panelLabel = getPanelLabelByRole(user?.role);
  const backofficeLinks = useMemo(() => getBackofficeMenuLinks(user), [user]);
  const customerLinks = useMemo(() => getCustomerMenuLinks(), []);
  const isAccountRoute = Boolean(
    pathname &&
      (pathname.startsWith('/account') ||
        pathname.startsWith('/panel') ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/pos')),
  );

  useEffect(() => {
    if (!isSearchOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAccountMenuOpen]);

  const submitSearch = () => {
    const query = trimmedQuery;
    if (!query) return;

    setIsSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
    window.setTimeout(() => setSearchValue(''), 0);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      dispatch(logout());
      setIsAccountMenuOpen(false);
      toast.success('Çıkış yapıldı.');
      router.push('/');
    }
  };

  const coreAccountLinks = user
    ? [
        {
          href: accountHref,
          icon: LayoutDashboard,
          label: panelLabel,
          description:
            user.role === 'CUSTOMER'
              ? 'Siparişlerinizi ve hesap detaylarınızı yönetin.'
              : 'Yetkili olduğunuz çalışma alanına doğrudan geçin.',
        },
        {
          href: '/account/profile',
          icon: User,
          label: 'Profil',
          description: 'İletişim ve hesap bilgilerinizi düzenleyin.',
        },
        {
          href: '/account/settings',
          icon: Settings,
          label: 'Ayarlar',
          description: 'Bildirim ve güvenlik tercihlerinizi yönetin.',
        },
      ]
    : [];

  const navItems = [
    { href: '/', label: 'Ana', Icon: Home },
    { href: '/categories', label: 'Shop', Icon: Store },
    { href: '/cart', label: 'Sepet', Icon: ShoppingBag, badge: totalQuantity },
  ];

  return (
    <>
      {isAccountMenuOpen && user ? (
        <>
          <button
            type="button"
            aria-label="Hesap menüsünü kapat"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setIsAccountMenuOpen(false)}
          />
          <section className="fixed inset-x-3 bottom-[84px] z-50 overflow-hidden rounded-[28px] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-2xl)] md:hidden">
            <div className="bg-[linear-gradient(135deg,#14352F_0%,#1F5649_55%,#C98963_100%)] px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">
                    Hesap Merkezi
                  </p>
                  <h2 className="mt-2 text-2xl font-serif">
                    {user.name ?? 'Nutopiano Kullanıcısı'}
                  </h2>
                  <p className="mt-2 text-sm text-white/80">
                    {panelLabel}
                    {user.phone ? ` • ${user.phone}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[65vh] overflow-y-auto bg-[linear-gradient(180deg,#FBF8F2_0%,#FFFFFF_72%)] p-4">
              <div className="grid gap-3">
                {coreAccountLinks.map(({ href, icon: Icon, label, description }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsAccountMenuOpen(false)}
                    className="rounded-[22px] border border-[var(--neutral-200)] bg-white px-4 py-4 shadow-[var(--shadow-md)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--neutral-100)] text-[var(--primary-800)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[var(--primary-800)]">
                          {label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--neutral-600)]">
                          {description}
                        </span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {backofficeLinks.length > 0 ? (
                <div className="mt-5">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--neutral-500)]">
                    Operasyon
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {backofficeLinks.map(({ href, icon: Icon, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-[20px] border border-[var(--neutral-200)] bg-white px-4 py-3 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)]"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {user.role === 'CUSTOMER' && customerLinks.length > 0 ? (
                <div className="mt-5">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--neutral-500)]">
                    Hesap Kısayolları
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {customerLinks.map(({ href, icon: Icon, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-[20px] border border-[var(--neutral-200)] bg-white px-4 py-3 text-sm font-medium text-[var(--primary-800)] shadow-[var(--shadow-sm)]"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleLogout}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] border border-[var(--error-100)] bg-[var(--error-100)]/15 px-4 py-3 text-sm font-semibold text-[var(--error-600)]"
              >
                <LogOut className="h-4 w-4" />
                Çıkış Yap
              </button>
            </div>
          </section>
        </>
      ) : null}

      <nav
        aria-label="Mobil alt navigasyon"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white md:hidden"
      >
        <div className="border-t border-[var(--neutral-200)] bg-white shadow-[var(--shadow-lg)]">
          {isSearchOpen ? (
            <div className="border-b border-[var(--neutral-200)] bg-white px-2 py-1.5">
              <div className="mx-auto flex max-w-6xl items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)]"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-3 py-2 text-[var(--primary-800)]">
                  <input
                    ref={inputRef}
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitSearch();
                    }}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--neutral-500)]"
                    placeholder="Ürün ara..."
                    aria-label="Ürün ara"
                  />
                </div>
                <button
                  type="button"
                  onClick={submitSearch}
                  disabled={!trimmedQuery}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] disabled:opacity-50"
                  aria-label="Ara"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-2 py-2">
            <Link
              href="/"
              aria-label="Anasayfa"
              aria-current={pathname === '/' ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-[11px] font-medium transition-colors ${
                pathname === '/'
                  ? 'text-[var(--primary-800)]'
                  : 'text-[var(--neutral-600)] hover:text-[var(--primary-800)]'
              }`}
            >
              <Home className="h-5 w-5" />
              <span>Ana</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsSearchOpen((value) => !value)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-[11px] font-medium transition-colors ${
                isSearchOpen
                  ? 'text-[var(--primary-800)]'
                  : 'text-[var(--neutral-600)] hover:text-[var(--primary-800)]'
              }`}
              aria-label="Ara"
            >
              <Search className="h-5 w-5" />
              <span>Ara</span>
            </button>

            {navItems.slice(1).map(({ href, label, Icon, badge }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={`${label}-${href}`}
                  href={href}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-[11px] font-medium transition-colors ${
                    active
                      ? 'text-[var(--primary-800)]'
                      : 'text-[var(--neutral-600)] hover:text-[var(--primary-800)]'
                  }`}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {typeof badge === 'number' && badge > 0 ? (
                      <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent-600)] px-1.5 text-[10px] font-semibold text-white shadow-sm">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}

            {user ? (
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(true)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-[11px] font-medium transition-colors ${
                  isAccountMenuOpen || isAccountRoute
                    ? 'text-[var(--primary-800)]'
                    : 'text-[var(--neutral-600)] hover:text-[var(--primary-800)]'
                }`}
                aria-label={accountLabel}
                aria-expanded={isAccountMenuOpen}
              >
                <UserCircle2 className="h-5 w-5" />
                <span>{accountLabel}</span>
              </button>
            ) : (
              <Link
                href={accountHref}
                aria-label={accountLabel}
                aria-current={isActivePath(pathname, accountHref) ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-[11px] font-medium transition-colors ${
                  isActivePath(pathname, accountHref)
                    ? 'text-[var(--primary-800)]'
                    : 'text-[var(--neutral-600)] hover:text-[var(--primary-800)]'
                }`}
              >
                <UserCircle2 className="h-5 w-5" />
                <span>{accountLabel}</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
