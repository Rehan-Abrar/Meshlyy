import type { CacheStore } from '../interfaces';

type CacheRecord = {
  value: unknown;
  expiresAt: number;
};

export class MemoryCacheStore implements CacheStore {
  private readonly cache = new Map<string, CacheRecord>();

  async get<T>(key: string): Promise<T | null> {
    const record = this.cache.get(key);
    if (!record) return null;

    if (record.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return record.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}
