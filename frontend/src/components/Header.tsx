'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Search, ShoppingBag, UserCircle2 } from 'lucide-react';
import { useAppSelector } from '@/store';

export default function Header() {
  const totalQuantity = useAppSelector((state) => state.cart.totalQuantity);
  const user = useAppSelector((state) => state.user.user);

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="border-b border-[#e5e5e5]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
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

          <div className="relative w-full md:max-w-xl">
            <input
              placeholder="Search..."
              className="h-11 w-full rounded-full border border-[#e5e5e5] bg-[#f5f5f5] px-5 pr-12 text-sm text-[#222222] outline-none focus-visible:border-[#00a651]"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#777777]">
              <Search className="h-5 w-5" />
            </span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              href={user ? '/account/profile' : '/login'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#222222]"
              aria-label="Hesap"
            >
              <UserCircle2 className="h-5 w-5" />
            </Link>
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#222222]"
              aria-label="Favoriler"
            >
              <Heart className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#e53935] px-1 text-[10px] font-semibold text-white">
                0
              </span>
            </button>
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
      </div>

      <div className="bg-[#0f4f3a]">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <nav className="flex flex-wrap items-center gap-6 py-3 text-sm font-semibold text-white">
            <Link href="/" className="hover:text-white/90">
              Home Page
            </Link>
            <Link href="/products" className="text-[#00a651] hover:text-[#00a651]">
              Shop
            </Link>
            <Link href="/products" className="hover:text-white/90">
              Product
            </Link>
            <Link href="/account/profile" className="hover:text-white/90">
              Pages
            </Link>
            <Link href="/" className="hover:text-white/90">
              Blog
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
