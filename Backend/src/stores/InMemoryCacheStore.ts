// In-memory implementation of CacheStore using node-cache
// Post-MVP: Replace with Redis

import NodeCache from 'node-cache';
import { CacheStore } from '../types/stores';

export class InMemoryCacheStore implements CacheStore {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({ 
      stdTTL: 0, // TTL per key
      checkperiod: 1, // Cleanup every 1 second (was 60, too infrequent for tests)
      useClones: false
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get<T>(key);
    return value !== undefined ? value : null;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    // node-cache expects TTL in seconds, convert from milliseconds
    const ttlSeconds = ttlMs / 1000;
    this.cache.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    this.cache.del(key);
  }
}
