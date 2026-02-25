'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bolt,
  ClipboardList,
  CreditCard,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Store,
  User,
  UserCircle2,
  type LucideIcon,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/userSlice';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getPanelLabelByRole, isPosRoleAllowed } from '@/lib/role-routing';

export default function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const totalQuantity = useAppSelector((state) => state.cart.totalQuantity);
  const user = useAppSelector((state) => state.user.user);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const trimmedQuery = useMemo(() => searchValue.trim(), [searchValue]);
  const panelHref = user ? '/panel' : '/login';
  const panelLabel = getPanelLabelByRole(user?.role);
  const isCustomer = user?.role === 'CUSTOMER';

  type BackofficeMenuLink = {
    href: string;
    label: string;
    icon: LucideIcon;
  };

  const backofficeMenuLinks = useMemo<BackofficeMenuLink[]>(() => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return [
          { href: '/platform/users', label: 'Kullanıcılar', icon: User },
          { href: '/platform/sellers', label: 'Satıcılar', icon: Store },
          { href: '/platform/plans', label: 'Planlar', icon: CreditCard },
          { href: '/platform/orders', label: 'Siparişler', icon: ClipboardList },
          ...(isPosRoleAllowed(user?.role)
            ? [{ href: '/pos', label: 'POS', icon: LayoutDashboard }]
            : []),
        ];
      case 'ADMIN':
        return [
          { href: '/admin/orders', label: 'Siparişler', icon: ClipboardList },
          { href: '/admin/products', label: 'Ürünler', icon: Package },
          { href: '/admin/customers', label: 'Müşteriler', icon: User },
          { href: '/admin/finance', label: 'Finans', icon: CreditCard },
          ...(isPosRoleAllowed(user?.role)
            ? [{ href: '/pos', label: 'POS', icon: LayoutDashboard }]
            : []),
        ];
      case 'SELLER':
        return [
          { href: '/pos', label: 'POS', icon: LayoutDashboard },
          { href: '/dashboard/orders', label: 'Siparişler', icon: ClipboardList },
          { href: '/dashboard/products', label: 'Ürünler', icon: Package },
          { href: '/dashboard/finance', label: 'Finans', icon: CreditCard },
          { href: '/dashboard/customers', label: 'Müşteriler', icon: User },
        ];
      case 'USER':
        return [
          { href: '/pos', label: 'POS', icon: LayoutDashboard },
          { href: '/dashboard/orders', label: 'Siparişler', icon: ClipboardList },
        ];
      default:
        return [];
    }
  }, [user?.role]);

  const navigationLinks = [
    { href: '/categories', label: 'Kategoriler' },
    { href: '/products', label: 'Ürünler' },
    { href: '/checkout', label: 'Checkout' },
  ];

  useEffect(() => {
    if (!isSearchOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const el = searchWrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [isSearchOpen]);

  // Close user menu on outside click
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const el = userMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [isUserMenuOpen]);

  const submitSearch = () => {
    const q = trimmedQuery;
    if (!q) return;
    setIsSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    window.setTimeout(() => setSearchValue(''), 0);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      dispatch(logout());
      toast.success('Çıkış yapıldı.');
      setIsUserMenuOpen(false);
      router.push('/');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--neutral-200)] bg-white/95 backdrop-blur-md shadow-[var(--shadow-sm)] md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/"
            aria-label="Nutopiano anasayfa"
            className="flex items-center transition-opacity hover:opacity-80"
          >
            <Image
              src="/nutopiano-logo.png"
              alt="Nutopiano"
              width={120}
              height={28}
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/categories"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] shadow-[var(--shadow-xs)]"
              aria-label="Kategoriler"
            >
              <Store className="h-4 w-4" />
            </Link>
            <Link
              href="/cart"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] shadow-[var(--shadow-xs)]"
              aria-label="Sepet"
            >
              <ShoppingBag className="h-4 w-4" />
              {totalQuantity > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent-600)] px-1.5 text-[10px] font-semibold text-white shadow-sm">
                  {totalQuantity}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-40 hidden border-b border-[var(--neutral-200)] bg-white/80 backdrop-blur-xl shadow-[var(--shadow-sm)] md:block">
        <div className="border-b border-[var(--neutral-200)]/80 bg-[var(--brand-ink)] text-[var(--brand-sand)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
            <p className="flex items-center gap-2 text-[var(--brand-sand)]/90">
              <Bolt className="h-3.5 w-3.5" />
              Canlı stok ve hızlı POS akışı
            </p>
            <div className="flex items-center gap-4">
              <Link href="/categories" className="text-[var(--brand-sand)]/80 transition hover:text-white">
                Shop
              </Link>
              {isPosRoleAllowed(user?.role) && (
                <Link href="/pos" className="text-[var(--brand-sand)]/80 transition hover:text-white">
                  POS Terminal
                </Link>
              )}
              <Link href={panelHref} className="text-[var(--brand-sand)]/80 transition hover:text-white">
                {panelLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" aria-label="Nutopiano anasayfa" className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-80">
              <Image
                src="/nutopiano-logo.png"
                alt="Nutopiano"
                width={142}
                height={30}
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </Link>
            <nav className="hidden items-center gap-2 lg:flex">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--primary-800)]/75 transition hover:bg-[var(--neutral-100)] hover:text-[var(--primary-800)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <div
              ref={searchWrapRef}
              className={`relative flex h-10 items-center overflow-hidden rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] shadow-[var(--shadow-sm)] transition-all duration-300 ease-out ${
                isSearchOpen ? 'w-[280px] xl:w-[360px]' : 'w-10'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (!isSearchOpen) {
                    setIsSearchOpen(true);
                    return;
                  }
                  if (trimmedQuery) {
                    submitSearch();
                    return;
                  }
                  setIsSearchOpen(false);
                }}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center transition-colors hover:text-[var(--primary-600)]"
                aria-label="Ara"
              >
                <Search className="h-5 w-5" />
              </button>
              <input
                ref={inputRef}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSearch();
                }}
                className={`h-10 w-full bg-transparent pr-3 text-sm text-[var(--primary-800)] outline-none transition-opacity duration-200 placeholder:text-[var(--neutral-500)] ${
                  isSearchOpen ? 'opacity-100' : 'opacity-0'
                }`}
                placeholder="Ürün ara..."
                aria-label="Ürün ara"
                tabIndex={isSearchOpen ? 0 : -1}
              />
            </div>

            <Link
              href="/categories"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] shadow-[var(--shadow-sm)] transition hover:border-[var(--neutral-300)] hover:text-[var(--primary-600)]"
              aria-label="Shop"
            >
              <Store className="h-5 w-5" />
            </Link>

            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] shadow-[var(--shadow-sm)] transition hover:border-[var(--neutral-300)] hover:text-[var(--primary-600)]"
                aria-label="Hesap menüsü"
              >
                <UserCircle2 className="h-5 w-5" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-2xl)]">
                  {user ? (
                    <>
                      <div className="border-b border-[var(--neutral-200)] bg-[var(--neutral-100)]/65 px-4 py-3">
                        <p className="text-sm font-semibold text-[var(--primary-800)]">{user.name}</p>
                        <p className="text-xs text-[var(--neutral-500)]">{user.phone}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--neutral-500)]">
                          {panelLabel}
                        </p>
                      </div>
                      <div className="space-y-1 p-2">
                        <Link
                          href={panelHref}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--primary-800)] hover:bg-[var(--neutral-100)]"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          {panelLabel}
                        </Link>
                        <Link
                          href="/account/profile"
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--primary-800)] hover:bg-[var(--neutral-100)]"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          Profil
                        </Link>
                        {!isCustomer && backofficeMenuLinks.length > 0 ? (
                          <div className="my-1 border-t border-[var(--neutral-200)] pt-1">
                            {backofficeMenuLinks.map((link) => {
                              const Icon = link.icon;
                              return (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--primary-800)] hover:bg-[var(--neutral-100)]"
                                  onClick={() => setIsUserMenuOpen(false)}
                                >
                                  <Icon className="h-4 w-4" />
                                  {link.label}
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                        {isCustomer && (
                          <>
                            <Link
                              href="/account/orders"
                              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--primary-800)] hover:bg-[var(--neutral-100)]"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <ShoppingBag className="h-4 w-4" />
                              Siparişlerim
                            </Link>
                            <Link
                              href="/account/favorites"
                              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--primary-800)] hover:bg-[var(--neutral-100)]"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Heart className="h-4 w-4" />
                              Favorilerim
                            </Link>
                            <Link
                              href="/account/reviews"
                              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--primary-800)] hover:bg-[var(--neutral-100)]"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <MessageSquare className="h-4 w-4" />
                              Yorumlarım
                            </Link>
                            <Link
                              href="/account/addresses"
                              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--primary-800)] hover:bg-[var(--neutral-100)]"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <MapPin className="h-4 w-4" />
                              Adreslerim
                            </Link>
                          </>
                        )}
                        <Link
                          href="/account/settings"
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--primary-800)] hover:bg-[var(--neutral-100)]"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
                          Ayarlar
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--error-600)] hover:bg-[var(--error-100)]"
                        >
                          <LogOut className="h-4 w-4" />
                          Çıkış Yap
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 p-3">
                      <Link
                        href="/login"
                        className="flex items-center justify-center rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-700)]"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Giriş Yap
                      </Link>
                      <Link
                        href="/register"
                        className="flex items-center justify-center rounded-lg border border-[var(--primary-800)] px-4 py-2 text-sm font-semibold text-[var(--primary-800)] hover:bg-[var(--neutral-100)]"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Kayıt Ol
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] shadow-[var(--shadow-sm)] transition hover:border-[var(--neutral-300)] hover:text-[var(--primary-600)]"
              aria-label="Sepet"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalQuantity > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent-600)] px-1.5 text-[10px] font-semibold text-white shadow-sm">
                  {totalQuantity}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

