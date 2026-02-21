import {
  buildPaginationMeta,
  clampPage,
  clampPageSize,
  paginationToSkipTake,
  type PaginationMeta,
} from '@common/utils/pagination';
import { Injectable } from '@nestjs/common';
import {
  ProductsService,
  type ProductSummary,
} from '../products/products.service';

export interface MarketplaceSearchResult {
  data: ProductSummary[];
  meta: PaginationMeta;
}

@Injectable()
export class MarketplaceService {
  constructor(private readonly productsService: ProductsService) {}

  async searchProducts(params: {
    query?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    pageSize?: number;
  }): Promise<MarketplaceSearchResult> {
    const page = clampPage(Number(params.page ?? 1));
    const pageSize = clampPageSize(Number(params.pageSize ?? 20));

    // We compute meta from total to guarantee PDF contract {data, meta}.
    // Use a 2-step approach: count first via existing searchProducts.
    const metaSeed = buildPaginationMeta(0, page, pageSize);
    const { skip, take } = paginationToSkipTake(metaSeed);

    const result = await this.productsService.searchProducts({
      query: params.query,
      categoryId: params.categoryId,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sort: params.sort,
      skip,
      take,
    });

    const meta = buildPaginationMeta(result.total, page, pageSize);

    // If requested page was beyond totalPages, re-run query for the clamped page.
    if (meta.page !== page) {
      const { skip: correctedSkip, take: correctedTake } =
        paginationToSkipTake(meta);
      const corrected = await this.productsService.searchProducts({
        query: params.query,
        categoryId: params.categoryId,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        sort: params.sort,
        skip: correctedSkip,
        take: correctedTake,
      });

      return { data: corrected.data, meta };
    }

    return { data: result.data, meta };
  }
}
