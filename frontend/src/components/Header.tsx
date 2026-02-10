'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, UserCircle2 } from 'lucide-react';
import { useAppSelector } from '@/store';

export default function Header() {
  const totalQuantity = useAppSelector((state) => state.cart.totalQuantity);
  const user = useAppSelector((state) => state.user.user);

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
    </header>
  );
}
