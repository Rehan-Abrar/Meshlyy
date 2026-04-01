// In-memory implementation of BudgetStore
// Post-MVP: Replace with Redis

import { BudgetStore } from '../types/stores';

interface BudgetEntry {
  spend: number;
  lastReset: Date;
}

export class InMemoryBudgetStore implements BudgetStore {
  private budgets: Map<string, BudgetEntry> = new Map();

  async getSpend(key: string): Promise<number> {
    await this.checkAndResetIfNeeded(key);
    const entry = this.budgets.get(key);
    return entry?.spend || 0;
  }

  async incrementSpend(key: string, amount: number): Promise<number> {
    await this.checkAndResetIfNeeded(key);
    
    const entry = this.budgets.get(key) || { spend: 0, lastReset: new Date() };
    entry.spend += amount;
    this.budgets.set(key, entry);
    
    return entry.spend;
  }

  async resetAtMidnightUTC(key: string): Promise<void> {
    this.budgets.set(key, { spend: 0, lastReset: new Date() });
  }

  private async checkAndResetIfNeeded(key: string): Promise<void> {
    const entry = this.budgets.get(key);
    if (!entry) return;

    const now = new Date();
    const lastMidnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));

    if (entry.lastReset < lastMidnight) {
      await this.resetAtMidnightUTC(key);
    }
  }
}
