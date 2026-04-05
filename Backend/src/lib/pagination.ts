// Pagination utilities
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Parse and validate pagination parameters
 * 
 * @param params - Raw pagination parameters from query string
 * @returns Validated pagination params with defaults
 */
export function parsePaginationParams(params: PaginationParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(String(params.page || 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || 20), 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build pagination metadata
 * 
 * @param page - Current page (1-indexed)
 * @param limit - Items per page
 * @param total - Total count of items
 * @returns Pagination metadata
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    hasNext: page * limit < total,
  };
}

/**
 * Build paginated response
 * 
 * @param data - Page data
 * @param page - Current page
 * @param limit - Items per page
 * @param total - Total count
 * @returns Paginated response object
 */
export function buildPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: buildPaginationMeta(page, limit, total),
  };
}
