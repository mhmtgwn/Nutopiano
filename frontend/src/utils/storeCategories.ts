export type StoreCategoryType = 'PHYSICAL' | 'SERVICE' | 'WEIGHT' | 'CUSTOM';

export interface StoreCategory {
  id: string;
  name: string;
  description?: string;
  type?: StoreCategoryType;
}

export const STORE_CATEGORIES: StoreCategory[] = [
  {
    id: 'all',
    name: 'Tüm Ürünler',
    description: 'Nutopiano mağazasındaki tüm ürünleri keşfedin.',
  },
  {
    id: 'service',
    name: 'Hizmetler',
    description: 'Hizmet ve abonelik paketleri.',
    type: 'SERVICE',
  },
  {
    id: 'physical',
    name: 'Fiziksel Ürünler',
    description: 'Kargo ile teslim edilen ürünler.',
    type: 'PHYSICAL',
  },
  {
    id: 'weight',
    name: 'Kilo ile Satılan',
    description: 'Tartı veya kilo bazlı ürünler.',
    type: 'WEIGHT',
  },
  {
    id: 'custom',
    name: 'Özel Ürünler',
    description: 'Özel taleplere göre üretilen ürünler.',
    type: 'CUSTOM',
  },
];

export const getStoreCategoryById = (id: string) =>
  STORE_CATEGORIES.find((category) => category.id === id);
