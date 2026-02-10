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

  const submitSearch = () => {
    if (!trimmedQuery) return;
    setIsSearchOpen(false);
    router.push(`/products?q=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5e5e5] bg-white">
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
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#222222]"
            aria-label="Ara"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            href="/products"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#222222]"
            aria-label="Shop"
          >
            <Store className="h-5 w-5" />
          </Link>
          <Link
            href={user ? '/account/profile' : '/login'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#222222]"
            aria-label="Hesap"
          >
            <UserCircle2 className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#222222]"
            aria-label="Sepet"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#e53935] px-1 text-[10px] font-semibold text-white">
              {totalQuantity}
            </span>
          </Link>
        </div>
      </div>

      {isSearchOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Kapat"
            onClick={() => setIsSearchOpen(false)}
          />
          <div className="relative mx-auto mt-20 w-[min(92vw,640px)] rounded-md bg-white p-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-[#777777]" />
              <input
                ref={inputRef}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSearch();
                }}
                className="h-11 w-full rounded-sm border border-[#e5e5e5] bg-white px-3 text-sm text-[#222222] outline-none"
                placeholder="Ürün ara..."
                aria-label="Ürün ara"
              />
              <button
                type="button"
                onClick={submitSearch}
                disabled={!trimmedQuery}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-sm bg-[#00a651] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Ara
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
