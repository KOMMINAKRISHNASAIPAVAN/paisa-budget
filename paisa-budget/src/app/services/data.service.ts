import { Injectable, signal, computed } from '@angular/core';

export interface Budget {
  id: string;
  icon: string;
  category: string;
  type: 'monthly' | 'weekly';
  period: string;
  limit: number;
  spent: number;
  status: string;
  active: boolean;
}

export interface ExpenseItem {
  id: string;
  icon: string;
  description: string;
  category: string;
  date: string;
  payment: string;
  amount: number;
}

const SESSION_KEY = 'paisa_session';

function userId(): string {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? String(JSON.parse(s).id ?? 'guest') : 'guest';
  } catch { return 'guest'; }
}

function budgetsKey()  { return `paisa_budgets_${userId()}`; }
function expensesKey() { return `paisa_expenses_${userId()}`; }

function computeStatus(spent: number, limit: number): string {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  if (pct >= 100) return 'Over Budget';
  if (pct >= 90)  return 'At Risk';
  return 'On Track';
}

@Injectable({ providedIn: 'root' })
export class DataService {

  budgets  = signal<Budget[]>([]);
  expenses = signal<ExpenseItem[]>([]);

  // ── Load ──────────────────────────────────────────────────
  async loadAll() {
    await Promise.all([this.loadBudgets(), this.loadExpenses()]);
  }

  async loadBudgets() {
    try {
      const data: Budget[] = JSON.parse(localStorage.getItem(budgetsKey()) ?? '[]');
      this.budgets.set(data);
    } catch { this.budgets.set([]); }
  }

  async loadExpenses() {
    try {
      const data: ExpenseItem[] = JSON.parse(localStorage.getItem(expensesKey()) ?? '[]');
      this.expenses.set(data);
    } catch { this.expenses.set([]); }
  }

  // ── Budgets ───────────────────────────────────────────────
  async addBudgets(newBudgets: Budget[]): Promise<{ ok: boolean; error?: string }> {
    const existing: Budget[] = JSON.parse(localStorage.getItem(budgetsKey()) ?? '[]');

    for (const b of newBudgets) {
      const idx = existing.findIndex(
        e => e.category.toLowerCase() === b.category.toLowerCase() && e.type === b.type
      );
      if (idx >= 0) {
        // Upsert — update limit, keep spent
        existing[idx] = {
          ...existing[idx],
          icon:   b.icon,
          limit:  b.limit,
          period: b.period,
          status: computeStatus(existing[idx].spent, b.limit),
        };
      } else {
        existing.push({
          ...b,
          id:     `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          spent:  0,
          status: 'On Track',
          active: true,
        });
      }
    }

    localStorage.setItem(budgetsKey(), JSON.stringify(existing));
    await this.loadBudgets();
    return { ok: true };
  }

  async toggleBudget(id: string) {
    const list: Budget[] = JSON.parse(localStorage.getItem(budgetsKey()) ?? '[]');
    const idx = list.findIndex(b => b.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], active: !list[idx].active };
      localStorage.setItem(budgetsKey(), JSON.stringify(list));
      this.budgets.update(bl => bl.map(b => b.id === id ? list[idx] : b));
    }
  }

  async deleteBudget(id: string) {
    const list: Budget[] = JSON.parse(localStorage.getItem(budgetsKey()) ?? '[]');
    const updated = list.filter(b => b.id !== id);
    localStorage.setItem(budgetsKey(), JSON.stringify(updated));
    this.budgets.update(bl => bl.filter(b => b.id !== id));
  }

  // ── Expenses ──────────────────────────────────────────────
  async addExpense(item: Omit<ExpenseItem, 'id'>) {
    const newItem: ExpenseItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    const list: ExpenseItem[] = JSON.parse(localStorage.getItem(expensesKey()) ?? '[]');
    list.unshift(newItem);
    localStorage.setItem(expensesKey(), JSON.stringify(list));
    this.expenses.update(el => [newItem, ...el]);

    // Update spent on matching active budgets
    await this._updateBudgetSpent();
  }

  async deleteExpense(id: string) {
    const list: ExpenseItem[] = JSON.parse(localStorage.getItem(expensesKey()) ?? '[]');
    const updated = list.filter(e => e.id !== id);
    localStorage.setItem(expensesKey(), JSON.stringify(updated));
    this.expenses.update(el => el.filter(e => e.id !== id));
    await this._updateBudgetSpent();
  }

  // Recalculate spent for all budgets based on current expenses
  private async _updateBudgetSpent() {
    const expenses: ExpenseItem[] = JSON.parse(localStorage.getItem(expensesKey()) ?? '[]');
    const budgets: Budget[]       = JSON.parse(localStorage.getItem(budgetsKey()) ?? '[]');

    const now    = new Date();
    const month  = now.toLocaleString('default', { month: 'short' });
    const year   = String(now.getFullYear());

    const dayOfWeek = now.getDay(); // 0=Sun
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const updated = budgets.map(b => {
      let spent = 0;
      const catExpenses = expenses.filter(
        e => e.category.toLowerCase() === b.category.toLowerCase()
      );
      if (b.type === 'monthly') {
        spent = catExpenses
          .filter(e => e.date.includes(month) && e.date.includes(year))
          .reduce((s, e) => s + e.amount, 0);
      } else {
        spent = catExpenses
          .filter(e => new Date(e.date) >= weekStart)
          .reduce((s, e) => s + e.amount, 0);
      }
      return { ...b, spent, status: computeStatus(spent, b.limit) };
    });

    localStorage.setItem(budgetsKey(), JSON.stringify(updated));
    this.budgets.set(updated);
  }

  // ── Computed helpers ──────────────────────────────────────
  thisMonthExpenses = computed(() => {
    const now   = new Date();
    const month = now.toLocaleString('default', { month: 'short' });
    const year  = String(now.getFullYear());
    return this.expenses().filter(e => e.date.includes(month) && e.date.includes(year));
  });

  thisMonthTotal = computed(() =>
    this.thisMonthExpenses().reduce((s, e) => s + e.amount, 0)
  );

  weeklyTotal = computed(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);
    return this.expenses()
      .filter(e => { const d = new Date(e.date); return d >= weekAgo && d <= now; })
      .reduce((s, e) => s + e.amount, 0);
  });

  todayTotal = computed(() => {
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    return this.expenses()
      .filter(e => e.date === today)
      .reduce((s, e) => s + e.amount, 0);
  });

  recentExpenses = computed(() => this.expenses().slice(0, 5));

  groupedByDate = computed(() => {
    const map = new Map<string, ExpenseItem[]>();
    for (const e of this.expenses()) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  });

  clearAll() {
    this.budgets.set([]);
    this.expenses.set([]);
  }
}
