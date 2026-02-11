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
    <header className="sticky top-0 z-40 border-b border-[#E0D7C6] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" aria-label="Nutopiano anasayfa" className="flex items-center gap-3">
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
            className={`relative flex h-10 items-center overflow-hidden rounded-full border border-[#e5e5e5] bg-white text-[#1A3C34] transition-[width] duration-200 ease-out ${isSearchOpen ? 'w-[240px] md:w-[340px]' : 'w-10'
              }`}
          >
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center"
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
              className={`h-10 w-full bg-transparent pr-3 text-sm text-[#1A3C34] outline-none transition-opacity duration-150 ${isSearchOpen ? 'opacity-100' : 'opacity-0'
                }`}
              placeholder="Ürün ara..."
              aria-label="Ürün ara"
              tabIndex={isSearchOpen ? 0 : -1}
            />
          </div>
          <Link
            href="/products"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E0D7C6] bg-white text-[#1A3C34]"
            aria-label="Shop"
          >
            <Store className="h-5 w-5" />
          </Link>
          <Link
            href={user ? '/account/profile' : '/login'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E0D7C6] bg-white text-[#1A3C34]"
            aria-label="Hesap"
          >
            <UserCircle2 className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E0D7C6] bg-white text-[#1A3C34]"
            aria-label="Sepet"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#C5A059] px-1 text-[10px] font-semibold text-white">
              {totalQuantity}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
