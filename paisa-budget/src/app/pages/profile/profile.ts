import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService, ExpenseItem } from '../../services/data.service';
import { AuthService } from '../../services/auth';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAT_COLORS   = ['#4f6ef7','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private data = inject(DataService);
  auth         = inject(AuthService);

  initials = computed(() => {
    const name = this.auth.currentUser()?.name ?? '';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  });

  notifications = [
    { label: 'Budget Alerts',     desc: 'Get notified when you reach 90% of any budget', enabled: true  },
    { label: 'Daily Summary',     desc: 'Receive a daily expense summary every evening',  enabled: false },
    { label: 'Large Transactions',desc: 'Alert for transactions above ₹5,000',             enabled: true  },
    { label: 'Monthly Report',    desc: 'Get your monthly financial report on 1st',        enabled: true  },
    { label: 'Savings Milestone', desc: 'Celebrate when you hit savings milestones',       enabled: false },
  ];

  // ── Profile stats from real data ────────────────────────────
  totalBudgets   = computed(() => this.data.budgets().length);
  savingsRate    = computed(() => {
    const total = this.data.budgets().filter(b => b.active).reduce((s, b) => s + b.limit, 0);
    if (!total) return 0;
    return Math.max(0, Math.round(((total - this.data.thisMonthTotal()) / total) * 100));
  });

  showHistory = signal(false);

  // ── Available months (last 12) ──────────────────────────────
  availableMonths = computed(() => {
    const now = new Date();
    const list: { value: string; label: string; month: string; year: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = MONTH_LABELS[d.getMonth()];
      const year  = d.getFullYear();
      list.push({ value: `${month}-${year}`, label: `${month} ${year}`, month, year });
    }
    return list;
  });

  // Default to current month
  selectedMonth = signal(
    (() => {
      const now = new Date();
      return `${MONTH_LABELS[now.getMonth()]}-${now.getFullYear()}`;
    })()
  );

  // ── Filtered data for selected month ────────────────────────
  selectedExpenses = computed(() => {
    const [month, year] = this.selectedMonth().split('-');
    return this.data.expenses().filter(e =>
      e.date.includes(month) && e.date.includes(year)
    );
  });

  selectedTotal = computed(() =>
    this.selectedExpenses().reduce((s, e) => s + e.amount, 0)
  );

  selectedCategories = computed(() => {
    const expenses = this.selectedExpenses();
    if (!expenses.length) return [];
    const totals = new Map<string, number>();
    for (const e of expenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }
    const grand = Array.from(totals.values()).reduce((a, b) => a + b, 0);
    return Array.from(totals.entries())
      .map(([name, amount], i) => ({
        name, amount,
        pct:   Math.round((amount / grand) * 100),
        color: CAT_COLORS[i % CAT_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  });

  selectedGrouped = computed(() => {
    const map = new Map<string, ExpenseItem[]>();
    for (const e of this.selectedExpenses()) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  });
}
