export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  nextCursor: string | null;
}
