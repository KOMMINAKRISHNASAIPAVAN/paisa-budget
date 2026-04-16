import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Budget {
  id: string;
  icon: string;
  category: string;
  type: 'monthly' | 'weekly';
  period: string;
  totalBudget: number;
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
  budgetType: 'monthly' | 'weekly';
}

@Injectable({ providedIn: 'root' })
export class DataService {

  budgets  = signal<Budget[]>([]);
  expenses = signal<ExpenseItem[]>([]);

  constructor(private http: HttpClient) {}

  // ── Load ──────────────────────────────────────────────────
  async loadAll() {
    await Promise.all([this.loadBudgets(), this.loadExpenses()]);
  }

  async loadBudgets() {
    try {
      const data: any[] = await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/api/budgets`)
      );
      this.budgets.set(data.map(b => this.mapBudget(b)));
    } catch { this.budgets.set([]); }
  }

  async loadExpenses() {
    try {
      const data: any[] = await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/api/expenses`)
      );
      this.expenses.set(data.map(e => this.mapExpense(e)));
    } catch { this.expenses.set([]); }
  }

  // ── Budgets ───────────────────────────────────────────────
  async addBudgets(newBudgets: Budget[]): Promise<{ ok: boolean; error?: string }> {
    try {
      const payload = newBudgets.map(b => ({
        category:    b.category,
        icon:        b.icon,
        type:        b.type,
        periodLabel: b.period,
        totalBudget: b.totalBudget,
        budgetLimit: b.limit,
      }));
      await firstValueFrom(
        this.http.post<any[]>(`${environment.apiUrl}/api/budgets`, payload)
      );
      await this.loadBudgets();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.error?.message ?? 'Failed to save budget.' };
    }
  }

  async toggleBudget(id: string) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/api/budgets/${id}/toggle`, {})
      );
      await this.loadBudgets();
    } catch {}
  }

  async deleteBudget(id: string) {
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/api/budgets/${id}`)
      );
      this.budgets.update(bl => bl.filter(b => b.id !== id));
    } catch {}
  }

  // ── Expenses ──────────────────────────────────────────────
  async addExpense(item: Omit<ExpenseItem, 'id'>) {
    try {
      const payload = {
        icon:          item.icon,
        description:   item.description,
        category:      item.category,
        expenseDate:   this.toIsoDate(item.date),
        paymentMethod: item.payment,
        amount:        item.amount,
        budgetType:    item.budgetType,
      };
      const data: any = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/api/expenses`, payload)
      );
      const newItem = this.mapExpense(data);
      this.expenses.update(el => [newItem, ...el]);
      await this.loadBudgets();
    } catch {}
  }

  async updateExpense(id: string, item: Omit<ExpenseItem, 'id'>): Promise<{ ok: boolean; error?: string }> {
    try {
      const payload = {
        icon:          item.icon,
        description:   item.description,
        category:      item.category,
        expenseDate:   this.toIsoDate(item.date),
        paymentMethod: item.payment,
        amount:        item.amount,
        budgetType:    item.budgetType,
      };
      const data: any = await firstValueFrom(
        this.http.put<any>(`${environment.apiUrl}/api/expenses/${id}`, payload)
      );
      const updated = this.mapExpense(data);
      this.expenses.update(el => el.map(e => e.id === id ? updated : e));
      await this.loadBudgets();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.error?.message ?? 'Failed to update expense.' };
    }
  }

  async deleteExpense(id: string) {
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/api/expenses/${id}`)
      );
      this.expenses.update(el => el.filter(e => e.id !== id));
      await this.loadBudgets();
    } catch {}
  }

  // ── Mappers ───────────────────────────────────────────────
  private mapBudget(b: any): Budget {
    return {
      id:          String(b.id),
      icon:        b.icon ?? '💸',
      category:    b.category,
      type:        b.type,
      period:      b.periodLabel ?? '',
      totalBudget: b.totalBudget ?? 0,
      limit:       b.budgetLimit,
      spent:       b.spent ?? 0,
      status:      b.status ?? 'On Track',
      active:      b.isActive ?? true,
    };
  }

  private mapExpense(e: any): ExpenseItem {
    return {
      id:          String(e.id),
      icon:        e.icon ?? '💸',
      description: e.description,
      category:    e.category,
      date:        this.formatDate(e.expenseDate),
      payment:     e.paymentMethod ?? 'Cash',
      amount:      e.amount,
      budgetType:  e.budgetType ?? 'monthly',
    };
  }

  // "14 Apr 2026" or ISO → "2026-04-14"
  private toIsoDate(dateStr: string): string {
    try {
      const months: Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
      };
      const parts = dateStr.trim().split(/[\s/\-]/);
      if (parts.length === 3 && isNaN(Number(parts[1]))) {
        // "14 Apr 2026"
        const day   = parts[0].padStart(2, '0');
        const month = months[parts[1]] ?? '01';
        const year  = parts[2];
        return `${year}-${month}-${day}`;
      }
      // Already ISO or en-CA format "2026-04-14"
      const d = new Date(dateStr + 'T00:00:00');
      return d.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  // [2026,4,14] or "2026-04-14" → "14 Apr 2026"
  private formatDate(expenseDate: any): string {
    try {
      let d: Date;
      if (Array.isArray(expenseDate)) {
        d = new Date(expenseDate[0], expenseDate[1] - 1, expenseDate[2]);
      } else {
        d = new Date(expenseDate + 'T00:00:00');
      }
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
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
