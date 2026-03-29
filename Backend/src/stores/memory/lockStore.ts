import type { LockStore } from '../interfaces';

export class MemoryLockStore implements LockStore {
  private readonly locks = new Map<string, number>();

  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const expiresAt = this.locks.get(key);

    if (expiresAt && expiresAt > now) {
      return false;
    }

    this.locks.set(key, now + ttlMs);
    return true;
  }

  async release(key: string): Promise<void> {
    this.locks.delete(key);
  }
}
