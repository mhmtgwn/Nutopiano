'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import CategoryTile from '@/components/CategoryTile';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

interface Product {
	id: string;
	name: string;
	subtitle?: string | null;
	description?: string;
	price: number;
	imageUrl?: string | null;
	stock?: number | null;
	tags?: string[];
}

interface ApiProduct {
	id: number;
	name: string;
	subtitle?: string | null;
	description?: string | null;
	priceCents: number;
	imageUrl?: string | null;
	stock?: number | null;
	tags?: string[];
}

interface Category {
	slug: string;
	name: string;
	description?: string;
}

interface ApiCategory {
	id: number;
	name: string;
	slug: string;
	orderIndex: number;
}


export default function HomeClient() {
	const heroSlides = [
		{
			kicker: 'Nutopiano Shop',
			title: 'Yeni sezon ürünleri keşfet',
			description: 'Seçilmiş ürünler, hızlı teslimat ve güvenli ödeme ile alışverişini tamamla.',
			ctaLabel: 'Shop now',
			ctaHref: '/products',
			imageUrl: '/hero/IMG_3958.JPG',
		},
		{
			kicker: 'Koleksiyonlar',
			title: 'Kategoriler arasında gez',
			description: 'İhtiyacın olan ürünleri koleksiyonlara göre hızlıca bul.',
			ctaLabel: 'Koleksiyonlara git',
			ctaHref: '/categories',
			imageUrl: '/hero/IMG_3959.JPG',
		},
		{
			kicker: 'Hızlı & güvenli',
			title: 'Sepete ekle, hemen tamamla',
			description: 'Modern kart yapısı ve hover aksiyonlarıyla daha hızlı alışveriş.',
			ctaLabel: 'Öne çıkanları gör',
			ctaHref: '/products',
			imageUrl: '/hero/IMG_3962.JPG',
		},
	] as const;

	const [heroIndex, setHeroIndex] = useState(0);
	const [featuredStartIndex, setFeaturedStartIndex] = useState(0);
	const [featuredPerView, setFeaturedPerView] = useState(4);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setHeroIndex((prev) => (prev + 1) % heroSlides.length);
		}, 6000);
		return () => window.clearInterval(interval);
	}, [heroSlides.length]);

	useEffect(() => {
		const update = () => {
			const width = window.innerWidth;
			if (width < 640) {
				setFeaturedPerView(2);
			} else if (width < 768) {
				setFeaturedPerView(2);
			} else if (width < 1024) {
				setFeaturedPerView(3);
			} else {
				setFeaturedPerView(4);
			}
		};
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, []);

	const activeHero = heroSlides[heroIndex];

	const {
		data: products,
		isLoading: productsLoading,
		isError: productsError,
	} = useQuery<Product[]>({
		queryKey: ['products', { featured: true }],
		queryFn: async () => {
			const res = await api.get<ApiProduct[]>('/products', {
				params: { featured: true },
			});
			return res.data.map((p) => ({
				id: String(p.id),
				name: p.name,
				subtitle: p.subtitle ?? null,
				description: p.description ?? undefined,
				price: (p.priceCents ?? 0) / 100,
				imageUrl: p.imageUrl ?? null,
				stock: p.stock ?? null,
				tags: p.tags ?? [],
			}));
		},
	});

	const {
		data: categories,
		isLoading: categoriesLoading,
		isError: categoriesError,
	} = useQuery<Category[]>({
		queryKey: ['public-categories'],
		queryFn: async () => {
			const res = await api.get<ApiCategory[]>('/public/categories');
			return res.data
				.slice()
				.sort((a, b) => a.orderIndex - b.orderIndex)
				.map((c) => ({
					slug: c.slug,
					name: c.name,
				}));
		},
	});

	const isLoading = productsLoading || categoriesLoading;
	const hasError = productsError || categoriesError;

	const featuredCount = products?.length ?? 0;
	const safeFeaturedStartIndex = featuredCount
		? featuredStartIndex % featuredCount
		: 0;

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-10 md:px-6 md:py-12">
			<section className="relative">
				<div
					className="relative overflow-hidden rounded-[var(--radius-3xl)] bg-[var(--neutral-50)]"
					style={{
						backgroundImage: `url('${activeHero.imageUrl}')`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
					}}
				>
					<div className="absolute inset-0 bg-black/25" />
					<div className="relative mx-auto flex h-[220px] max-w-6xl flex-col justify-end px-4 pb-12 pt-8 md:h-auto md:min-h-[220px] md:px-6 md:pb-14">
						<button
							type="button"
							onClick={() =>
								setHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
							}
							className="absolute left-4 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white/90 transition hover:text-white"
							aria-label="Önceki"
						>
							<ChevronLeft className="h-8 w-8" />
						</button>
						<button
							type="button"
							onClick={() => setHeroIndex((prev) => (prev + 1) % heroSlides.length)}
							className="absolute right-4 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white/90 transition hover:text-white"
							aria-label="Sonraki"
						>
							<ChevronRight className="h-8 w-8" />
						</button>
						<div className="space-y-3 pl-12 pr-20 md:pl-14 md:pr-28">
							<h1 className="max-h-[2.2em] overflow-hidden text-4xl font-serif leading-[1.05] text-white md:max-h-none md:text-6xl">
								{activeHero.title}
							</h1>
							<p className="max-h-[2.8em] max-w-2xl overflow-hidden text-sm leading-snug text-white/80 md:max-h-none md:text-lg md:leading-normal">
								{activeHero.description}
							</p>
						</div>
					</div>
					<div className="absolute bottom-4 right-5 z-10">
						<Link
							href={activeHero.ctaHref}
							className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] shadow-[var(--shadow-lg)] transition hover:bg-white/95"
						>
							{activeHero.ctaLabel} <ArrowRight className="h-4 w-4" />
						</Link>
					</div>
					<div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
						{heroSlides.map((_, index) => {
							const active = index === heroIndex;
							return (
								<button
									type="button"
									key={`hero-dot-${index}`}
									onClick={() => setHeroIndex(index)}
									className={`h-2.5 w-2.5 rounded-full transition-colors ${
										active ? 'bg-white' : 'bg-white/35 hover:bg-white/60'
									}`}
									aria-label={`Hero slide ${index + 1}`}
								/>
							);
						})}
					</div>
				</div>
				<div className="mx-auto max-w-6xl px-4 pb-2 pt-4 md:px-6 md:pb-4">
					<div className="grid grid-cols-3 gap-3 md:gap-4">
						<div className="flex items-start gap-3">
							<Truck className="mt-0.5 h-5 w-5 text-[var(--accent-600)]" />
							<p className="text-[11px] leading-snug text-[var(--neutral-700)] md:text-sm">
								<span className="font-semibold text-[var(--primary-800)]">Hızlı teslimat</span>
								<br />
								Takipli kargo.
							</p>
						</div>
						<div className="flex items-start gap-3">
							<ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--accent-600)]" />
							<p className="text-[11px] leading-snug text-[var(--neutral-700)] md:text-sm">
								<span className="font-semibold text-[var(--primary-800)]">Güvenli ödeme</span>
								<br />
								Şeffaf adımlar.
							</p>
						</div>
						<div className="flex items-start gap-3">
							<MessageCircle className="mt-0.5 h-5 w-5 text-[var(--accent-600)]" />
							<p className="text-[11px] leading-snug text-[var(--neutral-700)] md:text-sm">
								<span className="font-semibold text-[var(--primary-800)]">WhatsApp</span>
								<br />
								Hızlı dönüş.
							</p>
						</div>
					</div>
				</div>
			</section>

			{isLoading && (
				<section>
					<Spinner fullscreen />
				</section>
			)}

			{hasError && !isLoading && (
				<section className="rounded-lg border border-[var(--error-100)] bg-[var(--error-100)]/10 px-4 py-3 text-sm text-[var(--error-600)]">
					İçerik yüklenirken bir hata oluştu. Lütfen daha sonra tekrar
					deneyin.
				</section>
			)}

			{!isLoading && !hasError && (
				<>
					<section className="space-y-0">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div>
								<h2
									data-testid="featured-heading"
									className="!text-xs !font-semibold !uppercase !tracking-[0.12em] !leading-none !text-[var(--primary-800)]"
								>
									Öne çıkan ürünler
								</h2>
							</div>
							<Link
								href="/products"
								className="inline-flex items-center gap-2 !text-xs !font-semibold !uppercase !tracking-[0.12em] !leading-none !text-[var(--primary-800)] transition-colors hover:text-[var(--primary-800)]"
							>
								Tümünü gör <ArrowRight className="h-4 w-4" />
							</Link>
						</div>
						{products && products.length > 0 ? (
							<div className="relative">
								<button
									type="button"
									onClick={() =>
										setFeaturedStartIndex((prev) =>
											featuredCount
													? (prev - 1 + featuredCount) % featuredCount
													: 0,
										)
									}
									className="absolute left-3 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white/90 drop-shadow transition hover:text-white"
									aria-label="Önceki"
								>
									<ChevronLeft className="h-9 w-9" />
								</button>
								<button
									type="button"
									onClick={() =>
										setFeaturedStartIndex((prev) =>
											featuredCount ? (prev + 1) % featuredCount : 0,
										)
									}
									className="absolute right-3 top-1/2 z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white/90 drop-shadow transition hover:text-white"
									aria-label="Sonraki"
								>
									<ChevronRight className="h-9 w-9" />
								</button>
								<div className="overflow-hidden">
									<div
										className={`grid items-stretch gap-4 ${
											featuredPerView === 1
												? 'grid-cols-1'
												: featuredPerView === 2
													? 'grid-cols-2'
													: featuredPerView === 3
														? 'grid-cols-3'
														: 'grid-cols-4'
										}`}
									>
										{Array.from({ length: Math.min(featuredPerView, products.length) }).map(
											(_, offset) => {
												const index =
													(safeFeaturedStartIndex + offset) % products.length;
												const product = products[index];
												return (
													<div key={`${product.id}-${index}`} className="h-full">
														<ProductCard product={product} variant="compact" />
													</div>
												);
											},
										)}
									</div>
								</div>
							</div>
						) : (
							<p className="text-sm text-[var(--neutral-600)]">
								Şu anda öne çıkan ürün bulunmuyor.
							</p>
						)}
					</section>
				</>
			)}
		</div>
	);
}
