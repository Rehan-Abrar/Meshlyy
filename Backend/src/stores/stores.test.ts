// Store interfaces unit tests

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryLockStore } from './InMemoryLockStore';
import { InMemoryCacheStore } from './InMemoryCacheStore';
import { InMemoryBudgetStore } from './InMemoryBudgetStore';

describe('InMemoryLockStore', () => {
  let store: InMemoryLockStore;

  beforeEach(() => {
    store = new InMemoryLockStore();
  });

  it('should acquire a lock successfully', async () => {
    const acquired = await store.acquire('test-key', 1000);
    expect(acquired).toBe(true);
  });

  it('should fail to acquire same lock twice', async () => {
    await store.acquire('test-key', 1000);
    const acquired = await store.acquire('test-key', 1000);
    expect(acquired).toBe(false);
  });

  it('should release a lock', async () => {
    await store.acquire('test-key', 1000);
    await store.release('test-key');
    const acquired = await store.acquire('test-key', 1000);
    expect(acquired).toBe(true);
  });

  it('should allow lock acquisition after TTL expires', async () => {
    await store.acquire('test-key', 100);
    await new Promise(resolve => setTimeout(resolve, 150));
    const acquired = await store.acquire('test-key', 1000);
    expect(acquired).toBe(true);
  });
});

describe('InMemoryCacheStore', () => {
  let store: InMemoryCacheStore;

  beforeEach(() => {
    store = new InMemoryCacheStore();
  });

  it('should set and get a value', async () => {
    await store.set('test-key', { data: 'test' }, 1000);
    const value = await store.get<{ data: string }>('test-key');
    expect(value).toEqual({ data: 'test' });
  });

  it('should return null for missing key', async () => {
    const value = await store.get('nonexistent');
    expect(value).toBeNull();
  });

  it('should delete a value', async () => {
    await store.set('test-key', 'test', 1000);
    await store.delete('test-key');
    const value = await store.get('test-key');
    expect(value).toBeNull();
  });

  it('should expire values after TTL', async () => {
    await store.set('test-key', 'test', 100);
    await new Promise(resolve => setTimeout(resolve, 150));
    const value = await store.get('test-key');
    expect(value).toBeNull();
  });
});

describe('InMemoryBudgetStore', () => {
  let store: InMemoryBudgetStore;

  beforeEach(() => {
    store = new InMemoryBudgetStore();
  });

  it('should start with zero spend', async () => {
    const spend = await store.getSpend('test-key');
    expect(spend).toBe(0);
  });

  it('should increment spend', async () => {
    await store.incrementSpend('test-key', 100);
    const spend = await store.getSpend('test-key');
    expect(spend).toBe(100);
  });

  it('should accumulate spend', async () => {
    await store.incrementSpend('test-key', 100);
    await store.incrementSpend('test-key', 50);
    const spend = await store.getSpend('test-key');
    expect(spend).toBe(150);
  });

  it('should reset spend to zero', async () => {
    await store.incrementSpend('test-key', 100);
    await store.resetAtMidnightUTC('test-key');
    const spend = await store.getSpend('test-key');
    expect(spend).toBe(0);
  });
});
