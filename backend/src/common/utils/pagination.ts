export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const clampPageSize = (value: number, fallback = 20, max = 100) => {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), max);
};

export const clampPage = (value: number, fallback = 1) => {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta => {
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
  const safePageSize = clampPageSize(pageSize);
  const safePage = clampPage(page);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));

  return {
    total: safeTotal,
    page: Math.min(safePage, totalPages),
    pageSize: safePageSize,
    totalPages,
  };
};

export const paginationToSkipTake = (meta: PaginationMeta) => {
  const skip = (meta.page - 1) * meta.pageSize;
  const take = meta.pageSize;
  return { skip, take };
};
