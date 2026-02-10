'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
		data: allProducts,
		isLoading: allProductsLoading,
		isError: allProductsError,
	} = useQuery<Product[]>({
		queryKey: ['products', { featured: false }],
		queryFn: async () => {
			const res = await api.get<ApiProduct[]>('/products');
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

	const isLoading = productsLoading || allProductsLoading || categoriesLoading;
	const hasError = productsError || allProductsError || categoriesError;

	const [activeTab, setActiveTab] = useState<'featured' | 'new' | 'best'>(
		'featured',
	);

	const tabProducts = useMemo(() => {
		const source = (allProducts ?? []).slice();
		if (activeTab === 'featured') {
			return (products ?? []).slice(0, 8);
		}
		if (activeTab === 'new') {
			return source.sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 8);
		}
		return source.sort((a, b) => b.price - a.price).slice(0, 8);
	}, [activeTab, allProducts, products]);

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 md:px-6 md:py-10">
			<section className="rounded-3xl bg-[#1A3C34] px-4 py-3 text-center text-xs font-semibold tracking-[0.2em] text-white md:text-sm">
				<span className="text-white/90">₺1000 üzeri kargo ücretsiz</span>
				<span className="mx-2 text-white/40">|</span>
				<span className="text-white/90">Aynı gün hazırlık</span>
				<span className="mx-2 text-white/40">|</span>
				<span className="text-white/90">WhatsApp destek</span>
			</section>

			<section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
				<div className="relative overflow-hidden rounded-[36px] border border-[#1A3C34]/10 bg-gradient-to-br from-[#F7F4EF] via-white to-[#F3FAF5] p-6 shadow-[0_60px_150px_rgba(26,60,52,0.12)] md:p-10">
					<div className="space-y-5">
						<p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#AC9C7A]">
							Nutopiano
						</p>
						<h1 className="text-3xl font-serif leading-tight text-[#1A3C34] md:text-5xl">
							Yeni sezon ürünleriyle alışverişe başla
						</h1>
						<p className="max-w-2xl text-sm text-[#5C5C5C] md:text-base">
							Seçilmiş ürünler, güvenli ödeme ve hızlı teslimat ile Nutopiano deneyimi.
						</p>
						<div className="flex flex-wrap gap-2">
							<Link
								href="/products"
								className="inline-flex items-center gap-2 rounded-full bg-[#1A3C34] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white hover:bg-[#16332c]"
							>
								Alışverişe başla <ArrowRight className="h-4 w-4" />
							</Link>
							<Link
								href="/categories"
								className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/30 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#1A3C34] hover:bg-[#1A3C34]/5"
							>
								Kategoriler
							</Link>
						</div>
						<div className="grid gap-3 pt-4 sm:grid-cols-3">
							<div className="rounded-2xl border border-[#1A3C34]/10 bg-white/80 px-4 py-3 text-sm text-[#1A3C34]">
								<ShieldCheck className="h-5 w-5 text-[#C5A059]" />
								<p className="mt-2 font-semibold">Güvenli ödeme</p>
								<p className="text-xs text-[#5C5C5C]">Şeffaf fiyat, hızlı onay</p>
							</div>
							<div className="rounded-2xl border border-[#1A3C34]/10 bg-white/80 px-4 py-3 text-sm text-[#1A3C34]">
								<Truck className="h-5 w-5 text-[#C5A059]" />
								<p className="mt-2 font-semibold">Hızlı kargo</p>
								<p className="text-xs text-[#5C5C5C]">Takipli teslimat</p>
							</div>
							<div className="rounded-2xl border border-[#1A3C34]/10 bg-white/80 px-4 py-3 text-sm text-[#1A3C34]">
								<MessageCircle className="h-5 w-5 text-[#C5A059]" />
								<p className="mt-2 font-semibold">Canlı destek</p>
								<p className="text-xs text-[#5C5C5C]">WhatsApp ile hızlı dönüş</p>
							</div>
						</div>
					</div>
				</div>

				<div className="grid gap-6">
					<Link
						href="/products"
						className="group relative overflow-hidden rounded-[28px] border border-[#1A3C34]/10 bg-gradient-to-br from-[#FFF9E6] via-[#FDFCF8] to-white p-6 shadow-[0_30px_80px_rgba(26,60,52,0.10)]"
					>
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
							Kampanya
						</p>
						<p className="mt-2 text-xl font-serif text-[#1A3C34]">
							Haftanın seçkisi
						</p>
						<p className="mt-1 text-sm text-[#5C5C5C]">
							Öne çıkan ürünleri keşfet
						</p>
						<span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#1A3C34]">
							İncele <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
						</span>
					</Link>

					<Link
						href="/checkout"
						className="group relative overflow-hidden rounded-[28px] border border-[#1A3C34]/10 bg-white p-6 shadow-[0_30px_80px_rgba(26,60,52,0.10)]"
					>
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
							Kargo & ödeme
						</p>
						<p className="mt-2 text-xl font-serif text-[#1A3C34]">
							Teslimat seçenekleri
						</p>
						<p className="mt-1 text-sm text-[#5C5C5C]">
							Kapıya teslim ve mağaza teslim
						</p>
						<span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#1A3C34]">
							Detay <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
						</span>
					</Link>
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
									Koleksiyon
								</p>
								<h2 className="text-2xl font-serif text-[#1A3C34] md:text-3xl">
									Kategoriler
								</h2>
							</div>
							<Link
								href="/categories"
								className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
							>
								Tüm kategoriler <ArrowRight className="h-4 w-4" />
							</Link>
						</div>
						{categories && categories.length > 0 ? (
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
								{categories.slice(0, 8).map((category) => (
									<CategoryTile key={category.slug} category={category} />
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
									Ürünler
								</p>
								<h2 className="text-2xl font-serif text-[#1A3C34] md:text-3xl">
									Popüler seçimler
								</h2>
							</div>
							<Link
								href="/products"
								className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1A3C34]/70 hover:text-[#1A3C34]"
							>
								Tümünü gör <ArrowRight className="h-4 w-4" />
							</Link>
						</div>

						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => setActiveTab('featured')}
								className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition ${
									activeTab === 'featured'
										? 'bg-[#1A3C34] text-white'
										: 'border border-[#1A3C34]/20 bg-white text-[#1A3C34] hover:bg-[#1A3C34]/5'
								}`}
							>
								Öne çıkan
							</button>
							<button
								type="button"
								onClick={() => setActiveTab('new')}
								className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition ${
									activeTab === 'new'
										? 'bg-[#1A3C34] text-white'
										: 'border border-[#1A3C34]/20 bg-white text-[#1A3C34] hover:bg-[#1A3C34]/5'
								}`}
							>
								Yeni
							</button>
							<button
								type="button"
								onClick={() => setActiveTab('best')}
								className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition ${
									activeTab === 'best'
										? 'bg-[#1A3C34] text-white'
										: 'border border-[#1A3C34]/20 bg-white text-[#1A3C34] hover:bg-[#1A3C34]/5'
								}`}
							>
								En iyi
							</button>
						</div>

						{tabProducts && tabProducts.length > 0 ? (
							<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
								{tabProducts.map((product) => (
									<ProductCard
										key={`${activeTab}-${product.id}`}
										product={product}
										variant="compact"
									/>
								))}
							</div>
						) : (
							<p className="text-sm text-foreground/60">Ürün bulunamadı.</p>
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
