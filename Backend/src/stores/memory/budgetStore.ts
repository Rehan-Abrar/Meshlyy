import type { BudgetStore } from '../interfaces';

export class MemoryBudgetStore implements BudgetStore {
  private readonly spend = new Map<string, number>();

  async getSpend(key: string): Promise<number> {
    return this.spend.get(key) ?? 0;
  }

  async incrementSpend(key: string, amount: number): Promise<number> {
    const nextValue = (this.spend.get(key) ?? 0) + amount;
    this.spend.set(key, nextValue);
    return nextValue;
  }

  async resetAtMidnightUTC(key: string): Promise<void> {
    this.spend.delete(key);
  }
}
