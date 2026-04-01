// Store instances singleton
// Provides global access to store implementations

import { InMemoryLockStore } from './InMemoryLockStore';
import { InMemoryCacheStore } from './InMemoryCacheStore';
import { InMemoryBudgetStore } from './InMemoryBudgetStore';
import { LockStore, CacheStore, BudgetStore } from '../types/stores';

export const lockStore: LockStore = new InMemoryLockStore();
export const cacheStore: CacheStore = new InMemoryCacheStore();
export const budgetStore: BudgetStore = new InMemoryBudgetStore();
