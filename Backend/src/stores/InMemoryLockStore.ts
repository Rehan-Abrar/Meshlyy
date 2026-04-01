// In-memory implementation of LockStore
// Post-MVP: Replace with Redis SET NX PX

import { LockStore } from '../types/stores';

export class InMemoryLockStore implements LockStore {
  private locks: Map<string, number> = new Map();

  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const existingExpiry = this.locks.get(key);

    // Check if lock exists and hasn't expired
    if (existingExpiry && existingExpiry > now) {
      return false;
    }

    // Acquire lock
    this.locks.set(key, now + ttlMs);
    return true;
  }

  async release(key: string): Promise<void> {
    this.locks.delete(key);
  }

  // Cleanup expired locks periodically
  private cleanup(): void {
    const now = Date.now();
    for (const [key, expiry] of this.locks.entries()) {
      if (expiry <= now) {
        this.locks.delete(key);
      }
    }
  }
}
