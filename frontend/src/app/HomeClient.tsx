'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, MessageCircle, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import CategoryTile from '@/components/CategoryTile';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

interface Product {
	id: string;
	name: string;
	description?: string;
	price: number;
	imageUrl?: string | null;
}

interface ApiProduct {
	id: number;
	name: string;
	description?: string | null;
	priceCents: number;
	imageUrl?: string | null;
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
				description: p.description ?? undefined,
				price: (p.priceCents ?? 0) / 100,
				imageUrl: p.imageUrl ?? null,
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

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 md:px-6">
			<section className="relative overflow-hidden rounded-[var(--radius-3xl)] border border-[var(--primary-800)]/10 bg-gradient-to-br from-[var(--neutral-50)] via-white to-[var(--neutral-100)] px-6 py-10 text-[var(--primary-800)] shadow-[var(--shadow-xl)] md:px-10">
				<div className="grid gap-10 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-center">
					<div className="space-y-5">
						<p className="text-xs font-semibold tracking-[0.3em] text-[var(--neutral-500)]">
							Nutopiano Shop
						</p>
						<h1 className="text-4xl font-serif leading-tight text-[var(--primary-800)] md:text-5xl">
							Seçilmiş ürünler, güvenli ödeme, hızlı teslimat
						</h1>
						<p className="max-w-2xl text-sm text-[var(--neutral-800)]/80 md:text-base">
							Stokta olan ürünleri anında görün, kapıya teslim veya mağaza
							teslim seçenekleriyle alışverişinizi tamamlayın.
						</p>
						<div className="flex flex-wrap gap-3 text-[11px] font-semibold tracking-[0.25em] text-[var(--primary-800)]">
							<span className="rounded-full bg-white px-4 py-2 shadow-sm">Güvenli ödeme</span>
							<span className="rounded-full border border-[var(--primary-800)]/20 px-4 py-2">
								Hızlı teslimat
							</span>
							<span className="rounded-full bg-[var(--primary-800)] px-4 py-2 text-white shadow-md">
								Takipli sipariş
							</span>
						</div>
						<Link
							href="/products"
							className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)]/80 hover:text-[var(--primary-800)] transition-colors"
						>
							Shop now <ArrowRight className="h-4 w-4" />
						</Link>
					</div>
					<div className="space-y-5 rounded-[var(--radius-2xl)] border border-white/60 bg-white/60 p-6 text-[var(--primary-800)] backdrop-blur-sm">
						<div className="space-y-2">
							<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
								Hızlı erişim
							</p>
							<div className="grid gap-2">
								<Link
									href="/products"
									className="inline-flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--primary-800)]/10 bg-white/70 px-4 py-3 text-sm font-semibold hover:bg-white transition-colors hover:shadow-sm"
								>
									Tüm ürünler <ArrowRight className="h-4 w-4" />
								</Link>
								<Link
									href="/categories"
									className="inline-flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--primary-800)]/10 bg-white/70 px-4 py-3 text-sm font-semibold hover:bg-white transition-colors hover:shadow-sm"
								>
									Kategoriler <ArrowRight className="h-4 w-4" />
								</Link>
								<Link
									href="/checkout"
									className="inline-flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--primary-800)]/10 bg-white/70 px-4 py-3 text-sm font-semibold hover:bg-white transition-colors hover:shadow-sm"
								>
									Kargo & ödeme <ArrowRight className="h-4 w-4" />
								</Link>
							</div>
						</div>
						<div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--primary-800)]/10 bg-white/70 px-4 py-4 text-sm">
							<div className="flex items-start gap-3">
								<Truck className="mt-0.5 h-5 w-5 text-[var(--accent-600)]" />
								<p>
									<span className="font-semibold">Hızlı teslimat</span>
									<br />
									Stoktan çıkış, takipli kargo.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--accent-600)]" />
								<p>
									<span className="font-semibold">Güvenli ödeme</span>
									<br />
									Ödeme adımlarında şeffaf fiyat.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<MessageCircle className="mt-0.5 h-5 w-5 text-[var(--accent-600)]" />
								<p>
									<span className="font-semibold">WhatsApp destek</span>
									<br />
									Sorularınız için hızlı dönüş.
								</p>
							</div>
						</div>
						<Link
							href="/products"
							className="inline-flex items-center gap-2 text-sm font-semibold hover:text-[var(--neutral-900)] transition-colors"
						>
							Öne çıkanları gör <ArrowRight className="h-4 w-4" />
						</Link>
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
					<section className="space-y-4">
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
									Shop
								</p>
								<h2 className="text-2xl font-serif text-[var(--primary-800)] md:text-3xl">
									Öne çıkan ürünler
								</h2>
							</div>
							<Link
								href="/products"
								className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)]/70 hover:text-[var(--primary-800)] transition-colors"
							>
								Tümünü gör <ArrowRight className="h-4 w-4" />
							</Link>
						</div>
						{products && products.length > 0 ? (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
								{products.map((product) => (
									<ProductCard
										key={product.id}
										product={product}
										variant="compact"
									/>
								))}
							</div>
						) : (
							<p className="text-sm text-[var(--neutral-600)]">
								Şu anda öne çıkan ürün bulunmuyor.
							</p>
						)}
					</section>

					<section className="space-y-4">
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
									Shop
								</p>
								<h2 className="text-2xl font-serif text-[var(--primary-800)] md:text-3xl">
									Koleksiyonlar
								</h2>
							</div>
							<Link
								href="/products"
								className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)]/70 hover:text-[var(--primary-800)] transition-colors"
							>
								Tüm koleksiyonlar <ArrowRight className="h-4 w-4" />
							</Link>
						</div>
						{categories && categories.length > 0 ? (
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
								{categories.map((category) => (
									<CategoryTile
										key={category.slug}
										category={category}
									/>
								))}
							</div>
						) : (
							<p className="text-sm text-[var(--neutral-600)]">
								Henüz kategori bulunmuyor.
							</p>
						)}
					</section>

					<section className="space-y-4">
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
									Güvence
								</p>
								<h2 className="text-2xl font-serif text-[var(--primary-800)] md:text-3xl">
									Teslimat & destek
								</h2>
							</div>
							<Link
								href="/checkout"
								className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)]/70 hover:text-[var(--primary-800)] transition-colors"
							>
								Ödeme adımları <ArrowRight className="h-4 w-4" />
							</Link>
						</div>
						<div className="grid gap-4 md:grid-cols-3">
							<div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white/90 p-5 shadow-[var(--shadow-md)]">
								<ShieldCheck className="h-5 w-5 text-[var(--accent-600)]" />
								<h3 className="mt-4 text-lg font-serif text-[var(--primary-800)]">
									Güvenli ödeme
								</h3>
								<p className="mt-2 text-sm text-[var(--neutral-600)]">
									Havale/EFT ve dijital ödeme seçenekleri tek ekranda.
								</p>
							</div>
							<div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white/90 p-5 shadow-[var(--shadow-md)]">
								<Truck className="h-5 w-5 text-[var(--accent-600)]" />
								<h3 className="mt-4 text-lg font-serif text-[var(--primary-800)]">
									Hızlı teslimat
								</h3>
								<p className="mt-2 text-sm text-[var(--neutral-600)]">
									Aynı gün hazırlık, takipli kargo ve kapıya teslim.
								</p>
							</div>
							<div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white/90 p-5 shadow-[var(--shadow-md)]">
								<MessageCircle className="h-5 w-5 text-[var(--accent-600)]" />
								<h3 className="mt-4 text-lg font-serif text-[var(--primary-800)]">
									Canlı destek
								</h3>
								<p className="mt-2 text-sm text-[var(--neutral-600)]">
									WhatsApp ve mail ile hızlı müşteri desteği.
								</p>
							</div>
						</div>
					</section>
				</>
			)}
		</div>
	);
}
