'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LayoutGrid, ShoppingBag, UserCircle2 } from 'lucide-react';
import { useAppSelector } from '@/store';

export default function Header() {
  const totalQuantity = useAppSelector((state) => state.cart.totalQuantity);
  const user = useAppSelector((state) => state.user.user);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E5E5] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Nutopiano anasayfa"
            className="flex items-center gap-3"
          >
            <Image
              src="/nutopiano-logo.png"
              alt="Nutopiano"
              width={140}
              height={32}
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
            <div className="hidden flex-col text-[10px] font-semibold uppercase tracking-[0.4em] text-[#222222]/70 md:flex">
              <span>Premium</span>
              <span>Market</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#222222]/70 md:hidden">
            <span>{totalQuantity} ürün</span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#222222]/80">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 transition hover:-translate-y-0.5"
          >
            <LayoutGrid className="h-4 w-4" />
            Shop
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 rounded-full bg-[#ff6a00] px-4 py-2 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#e45f00]"
          >
            <ShoppingBag className="h-4 w-4" />
            Sepet
            {totalQuantity > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/95 px-1 text-[10px] font-semibold text-[#222222]">
                {totalQuantity}
              </span>
            )}
          </Link>
          <Link
            href={user ? '/account/profile' : '/login'}
            className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2 transition hover:-translate-y-0.5"
          >
            <UserCircle2 className="h-4 w-4" />
            {user ? 'Hesabım' : 'Giriş'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
