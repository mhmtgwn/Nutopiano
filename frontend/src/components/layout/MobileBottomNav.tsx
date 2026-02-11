'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Store, UserCircle2 } from 'lucide-react';
import { useAppSelector } from '@/store';

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const totalQuantity = useAppSelector((state) => state.cart.totalQuantity);
  const user = useAppSelector((state) => state.user.user);

  const accountHref = user ? '/account/orders' : '/login';

  const items = [
    { href: '/', label: 'Anasayfa', Icon: Home },
    { href: '/products', label: 'Shop', Icon: Store },
    { href: accountHref, label: 'Hesap', Icon: UserCircle2 },
    { href: '/cart', label: 'Sepet', Icon: ShoppingBag, badge: totalQuantity },
  ];

  return (
    <nav
      aria-label="Mobil alt navigasyon"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--neutral-200)] bg-white/95 backdrop-blur-md shadow-[var(--shadow-lg)] md:hidden"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-4 px-2 py-2">
        {items.map(({ href, label, Icon, badge }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={`${label}-${href}`}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-[11px] font-semibold transition-colors ${
                active
                  ? 'text-[var(--primary-800)]'
                  : 'text-[var(--neutral-600)] hover:text-[var(--primary-800)]'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {typeof badge === 'number' && badge > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent-600)] px-1.5 text-[10px] font-semibold text-white shadow-sm">
                    {badge}
                  </span>
                )}
              </span>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
