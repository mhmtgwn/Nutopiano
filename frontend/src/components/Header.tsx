'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, Store, UserCircle2 } from 'lucide-react';
import { useAppSelector } from '@/store';

export default function Header() {
  const router = useRouter();
  const totalQuantity = useAppSelector((state) => state.cart.totalQuantity);
  const user = useAppSelector((state) => state.user.user);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const trimmedQuery = useMemo(() => searchValue.trim(), [searchValue]);

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

  const submitSearch = () => {
    if (!trimmedQuery) return;
    setIsSearchOpen(false);
    router.push(`/products?q=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--neutral-200)] bg-white/95 backdrop-blur-md shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" aria-label="Nutopiano anasayfa" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Image
            src="/nutopiano-logo.png"
            alt="Nutopiano"
            width={140}
            height={32}
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </Link>

        <div className="flex items-center justify-end gap-3">
          <div
            ref={searchWrapRef}
            className={`relative flex h-10 items-center overflow-hidden rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] transition-all duration-300 ease-out shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] ${
              isSearchOpen ? 'w-[240px] md:w-[340px]' : 'w-10'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
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
            href="/products"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] shadow-[var(--shadow-xs)] transition-all hover:shadow-[var(--shadow-sm)] hover:text-[var(--primary-600)] hover:border-[var(--neutral-300)]"
            aria-label="Shop"
          >
            <Store className="h-5 w-5" />
          </Link>
          <Link
            href={user ? '/account/profile' : '/login'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] shadow-[var(--shadow-xs)] transition-all hover:shadow-[var(--shadow-sm)] hover:text-[var(--primary-600)] hover:border-[var(--neutral-300)]"
            aria-label="Hesap"
          >
            <UserCircle2 className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-[var(--primary-800)] shadow-[var(--shadow-xs)] transition-all hover:shadow-[var(--shadow-sm)] hover:text-[var(--primary-600)] hover:border-[var(--neutral-300)]"
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
  );
}
