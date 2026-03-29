export interface LockStore {
  acquire(key: string, ttlMs: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface BudgetStore {
  getSpend(key: string): Promise<number>;
  incrementSpend(key: string, amount: number): Promise<number>;
  resetAtMidnightUTC(key: string): Promise<void>;
}
