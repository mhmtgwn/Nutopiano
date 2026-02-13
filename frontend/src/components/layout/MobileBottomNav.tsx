'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Home, Search, ShoppingBag, Store, UserCircle2, X } from 'lucide-react';
import { useAppSelector } from '@/store';

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileBottomNav() {
	const router = useRouter();
  const pathname = usePathname();
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

	const submitSearch = () => {
		const q = trimmedQuery;
		if (!q) return;
		setIsSearchOpen(false);
		router.push(`/search?q=${encodeURIComponent(q)}`);
		window.setTimeout(() => setSearchValue(''), 0);
	};

  const accountHref = user ? '/account/orders' : '/login';

  	const items = [
		{ href: '/products', label: 'Shop', Icon: Store },
		{ href: '/cart', label: 'Sepet', Icon: ShoppingBag, badge: totalQuantity },
		{ href: accountHref, label: 'Hesap', Icon: UserCircle2 },
	];

  	return (
		<nav
			aria-label="Mobil alt navigasyon"
			className="fixed bottom-0 left-0 right-0 z-50 bg-white md:hidden"
		>
			<div className="border-t border-[var(--neutral-200)] bg-white shadow-[var(--shadow-lg)]">
				{isSearchOpen && (
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
									onChange={(e) => setSearchValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') submitSearch();
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
				)}
				<div className="mx-auto grid max-w-6xl grid-cols-5 px-2 py-2">
					<Link
						href="/"
						aria-label="Anasayfa"
						aria-current={pathname === '/' ? 'page' : undefined}
						className={`relative flex items-center justify-center rounded-[var(--radius-md)] px-2 py-3 transition-colors ${
							pathname === '/'
								? 'text-[var(--primary-800)]'
								: 'text-[var(--neutral-600)] hover:text-[var(--primary-800)]'
						}`}
					>
						<Home className="h-5 w-5" />
					</Link>
					<button
						type="button"
						onClick={() => setIsSearchOpen((v) => !v)}
						className={`relative flex items-center justify-center rounded-[var(--radius-md)] px-2 py-3 transition-colors ${
							isSearchOpen
								? 'text-[var(--primary-800)]'
								: 'text-[var(--neutral-600)] hover:text-[var(--primary-800)]'
						}`}
						aria-label="Ara"
					>
						<Search className="h-5 w-5" />
					</button>
					{items.map(({ href, label, Icon, badge }) => {
						const active = isActivePath(pathname, href);
						return (
							<Link
								key={`${label}-${href}`}
								href={href}
								aria-label={label}
								aria-current={active ? 'page' : undefined}
								className={`relative flex items-center justify-center rounded-[var(--radius-md)] px-2 py-3 transition-colors ${
									active
										? 'text-[var(--primary-800)]'
										: 'text-[var(--neutral-600)] hover:text-[var(--primary-800)]'
								}`}
							>
								<span className="relative">
									<Icon className="h-5 w-5" />
									{typeof badge === 'number' && badge > 0 && (
										<span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent-600)] px-1.5 text-[10px] font-semibold text-white shadow-sm">
											{badge}
										</span>
									)}
								</span>
							</Link>
						);
					})}
				</div>
			</div>
		</nav>
	);
}
