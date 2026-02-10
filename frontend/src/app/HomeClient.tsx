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
			<section className="relative overflow-hidden rounded-[40px] border border-[#1A3C34]/10 bg-gradient-to-br from-[#FFF9E6] via-[#FDFCF8] to-[#F3FAF5] px-6 py-10 text-[#1A3C34] shadow-[0_60px_150px_rgba(26,60,52,0.18)] md:px-10">
				<div className="grid gap-10 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-center">
					<div className="space-y-5">
						<p className="text-xs font-semibold tracking-[0.3em] text-[#AC9C7A]">
							Nutopiano Shop
						</p>
						<h1 className="text-4xl font-serif leading-tight text-[#1A3C34] md:text-5xl">
							Seçilmiş ürünler, güvenli ödeme, hızlı teslimat
						</h1>
						<p className="max-w-2xl text-sm text-[#3E2723]/80 md:text-base">
							Stokta olan ürünleri anında görün, kapıya teslim veya mağaza
							teslim seçenekleriyle alışverişinizi tamamlayın.
						</p>
						<div className="flex flex-wrap gap-3 text-[11px] font-semibold tracking-[0.25em] text-[#1A3C34]">
							<span className="rounded-full bg-white px-4 py-2">Güvenli ödeme</span>
							<span className="rounded-full border border-[#1A3C34]/20 px-4 py-2">
								Hızlı teslimat
							</span>
							<span className="rounded-full bg-[#1A3C34] px-4 py-2 text-white">
								Takipli sipariş
							</span>
						</div>
						<Link
							href="/products"
							className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/80 hover:text-[#1A3C34]"
						>
							Shop now <ArrowRight className="h-4 w-4" />
						</Link>
					</div>
					<div className="space-y-5 rounded-[32px] border border-white/40 bg-white/70 p-6 text-[#1A3C34]">
						<div className="space-y-2">
							<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
								Hızlı erişim
							</p>
							<div className="grid gap-2">
								<Link
									href="/products"
									className="inline-flex items-center justify-between rounded-2xl border border-[#1A3C34]/10 bg-white/70 px-4 py-3 text-sm font-semibold hover:bg-white"
								>
									Tüm ürünler <ArrowRight className="h-4 w-4" />
								</Link>
								<Link
									href="/categories"
									className="inline-flex items-center justify-between rounded-2xl border border-[#1A3C34]/10 bg-white/70 px-4 py-3 text-sm font-semibold hover:bg-white"
								>
									Kategoriler <ArrowRight className="h-4 w-4" />
								</Link>
								<Link
									href="/checkout"
									className="inline-flex items-center justify-between rounded-2xl border border-[#1A3C34]/10 bg-white/70 px-4 py-3 text-sm font-semibold hover:bg-white"
								>
									Kargo & ödeme <ArrowRight className="h-4 w-4" />
								</Link>
							</div>
						</div>
						<div className="grid gap-3 rounded-2xl border border-[#1A3C34]/10 bg-white/70 px-4 py-4 text-sm">
							<div className="flex items-start gap-3">
								<Truck className="mt-0.5 h-5 w-5 text-[#C5A059]" />
								<p>
									<span className="font-semibold">Hızlı teslimat</span>
									<br />
									Stoktan çıkış, takipli kargo.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<ShieldCheck className="mt-0.5 h-5 w-5 text-[#C5A059]" />
								<p>
									<span className="font-semibold">Güvenli ödeme</span>
									<br />
									Ödeme adımlarında şeffaf fiyat.
								</p>
							</div>
							<div className="flex items-start gap-3">
								<MessageCircle className="mt-0.5 h-5 w-5 text-[#C5A059]" />
								<p>
									<span className="font-semibold">WhatsApp destek</span>
									<br />
									Sorularınız için hızlı dönüş.
								</p>
							</div>
						</div>
						<Link
							href="/products"
							className="inline-flex items-center gap-2 text-sm font-semibold hover:text-[#3E2723]"
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
				<section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					İçerik yüklenirken bir hata oluştu. Lütfen daha sonra tekrar
					deneyin.
				</section>
			)}

			{!isLoading && !hasError && (
				<>
					<section className="space-y-4">
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
									Shop
								</p>
								<h2 className="text-2xl font-serif text-[#1A3C34] md:text-3xl">
									Öne çıkan ürünler
								</h2>
							</div>
							<Link
								href="/products"
								className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
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
							<p className="text-sm text-foreground/60">
								Şu anda öne çıkan ürün bulunmuyor.
							</p>
						)}
					</section>

					<section className="space-y-4">
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
									Shop
								</p>
								<h2 className="text-2xl font-serif text-[#1A3C34] md:text-3xl">
									Koleksiyonlar
								</h2>
							</div>
							<Link
								href="/products"
								className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
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
							<p className="text-sm text-foreground/60">
								Henüz kategori bulunmuyor.
							</p>
						)}
					</section>

					<section className="space-y-4">
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
									Güvence
								</p>
								<h2 className="text-2xl font-serif text-[#1A3C34] md:text-3xl">
									Teslimat & destek
								</h2>
							</div>
							<Link
								href="/checkout"
								className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
							>
								Ödeme adımları <ArrowRight className="h-4 w-4" />
							</Link>
						</div>
						<div className="grid gap-4 md:grid-cols-3">
							<div className="rounded-3xl border border-[#E0D7C6] bg-white/90 p-5 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
								<ShieldCheck className="h-5 w-5 text-[#C5A059]" />
								<h3 className="mt-4 text-lg font-serif text-[#1A3C34]">
									Güvenli ödeme
								</h3>
								<p className="mt-2 text-sm text-[#5C5C5C]">
									Havale/EFT ve dijital ödeme seçenekleri tek ekranda.
								</p>
							</div>
							<div className="rounded-3xl border border-[#E0D7C6] bg-white/90 p-5 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
								<Truck className="h-5 w-5 text-[#C5A059]" />
								<h3 className="mt-4 text-lg font-serif text-[#1A3C34]">
									Hızlı teslimat
								</h3>
								<p className="mt-2 text-sm text-[#5C5C5C]">
									Aynı gün hazırlık, takipli kargo ve kapıya teslim.
								</p>
							</div>
							<div className="rounded-3xl border border-[#E0D7C6] bg-white/90 p-5 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
								<MessageCircle className="h-5 w-5 text-[#C5A059]" />
								<h3 className="mt-4 text-lg font-serif text-[#1A3C34]">
									Canlı destek
								</h3>
								<p className="mt-2 text-sm text-[#5C5C5C]">
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
