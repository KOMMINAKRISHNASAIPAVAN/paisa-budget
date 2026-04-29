import { Component, computed, inject } from '@angular/core';
import { Location } from '@angular/common';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth';
import { TranslatePipe } from '../../pipes/translate.pipe';

const CAT_COLORS = [
  '#4f6ef7', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
];

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-insights',
  imports: [TranslatePipe],
  templateUrl: './insights.html',
  styleUrl: './insights.scss',
})
export class Insights {
  Math     = Math;
  location = inject(Location);
  private data = inject(DataService);
  private auth = inject(AuthService);

  hasData = computed(() => this.data.expenses().length > 0);

  // ── Spending by Category ────────────────────────────────
  categories = computed(() => {
    const expenses = this.data.expenses();
    if (!expenses.length) return [];

    const totals = new Map<string, number>();
    for (const e of expenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }

    const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0);

    return Array.from(totals.entries())
      .map(([name, amount], i) => ({
        name,
        amount,
        pct:   Math.round((amount / grandTotal) * 100),
        color: CAT_COLORS[i % CAT_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  });

  // ── Monthly Trend (last 6 months) ───────────────────────
  months = computed(() => {
    const expenses = this.data.expenses();
    if (!expenses.length) return [];

    const now      = new Date();
    const result: { label: string; expense: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = MONTH_LABELS[d.getMonth()];
      const yr    = d.getFullYear();

      const total = expenses
        .filter(e => e.date.includes(label) && e.date.includes(String(yr)))
        .reduce((s, e) => s + e.amount, 0);

      result.push({ label, expense: total });
    }
    return result;
  });

  maxMonthExpense = computed(() =>
    Math.max(...this.months().map(m => m.expense), 1)
  );

  // ── Stat cards ──────────────────────────────────────────
  monthlySpend = computed(() => this.data.thisMonthTotal());
  weeklySpend  = computed(() => this.data.weeklyTotal());
  dailySpend   = computed(() => this.data.todayTotal());

  avgDailySpend = computed(() => {
    const expenses = this.data.thisMonthExpenses();
    if (!expenses.length) return 0;
    const daysPassed = new Date().getDate();
    return Math.round(this.data.thisMonthTotal() / daysPassed);
  });

  monthlyIncome = computed(() => this.auth.currentUser()?.monthlyIncome ?? 0);
  savingsGoal   = computed(() => this.auth.currentUser()?.savingsGoal ?? 0);

  // Uses actual income when set, otherwise falls back to budget total
  savingsRate = computed(() => {
    const income = this.monthlyIncome();
    const spent  = this.data.thisMonthTotal();
    if (income > 0) return Math.max(0, Math.round(((income - spent) / income) * 100));
    const total = this.data.budgets().filter(b => b.active).reduce((s, b) => s + b.limit, 0);
    if (!total) return 0;
    return Math.max(0, Math.round(((total - spent) / total) * 100));
  });

  biggestCategory = computed(() => {
    const cats = this.categories();
    return cats.length ? cats[0].name : '—';
  });

  // ── Smart Tips ──────────────────────────────────────────
  tips = computed(() => {
    const tips: { icon: string; title: string; text: string }[] = [];
    const budgets  = this.data.budgets().filter(b => b.active);
    const expenses = this.data.expenses();
    if (!budgets.length && !expenses.length) return tips;

    // Over-budget categories
    for (const b of budgets) {
      if (b.spent > b.limit) {
        tips.push({
          icon:  '⚠️',
          title: `${b.icon} ${b.category} Over Budget`,
          text:  `You spent ₹${(b.spent - b.limit).toLocaleString()} more than your ₹${b.limit.toLocaleString()} ${b.category} budget.`,
        });
      }
    }

    // Savings rate tip
    const rate = this.savingsRate();
    if (rate >= 30) {
      tips.push({
        icon:  '🎯',
        title: 'Great Savings Rate!',
        text:  `You are saving ${rate}% of your budget this month — well above the recommended 20%.`,
      });
    } else if (rate < 10 && budgets.length > 0) {
      tips.push({
        icon:  '📉',
        title: 'Low Savings Rate',
        text:  `Your savings rate is only ${rate}%. Review your largest categories to cut back.`,
      });
    }

    // Biggest category tip
    const top = this.categories()[0];
    if (top && top.pct > 40) {
      tips.push({
        icon:  '💡',
        title: `${top.name} Dominates Spending`,
        text:  `${top.name} accounts for ${top.pct}% of your total expenses (₹${top.amount.toLocaleString()}). Consider setting a stricter budget.`,
      });
    }

    // Invest tip
    const hasInvest = budgets.some(b => b.category.toLowerCase() === 'invest');
    if (!hasInvest && budgets.length > 0) {
      tips.push({
        icon:  '📈',
        title: 'Start Investing',
        text:  "You haven't set an Invest budget yet. Even ₹500/week in SIP can build long-term wealth.",
      });
    }

    // Income vs expense tip
    const income = this.monthlyIncome();
    const spent  = this.data.thisMonthTotal();
    if (income > 0 && spent > income) {
      tips.push({
        icon:  '🚨',
        title: 'Spending Exceeds Income',
        text:  `You've spent ₹${(spent - income).toLocaleString()} more than your monthly income of ₹${income.toLocaleString()}. Consider cutting back immediately.`,
      });
    } else if (income > 0 && spent > 0 && spent <= income) {
      const saved = income - spent;
      const goal  = this.savingsGoal();
      if (goal > 0 && saved >= goal) {
        tips.push({
          icon:  '🏆',
          title: 'Savings Goal Reached!',
          text:  `You've saved ₹${saved.toLocaleString()} this month, hitting your ₹${goal.toLocaleString()} savings goal. Great discipline!`,
        });
      } else if (goal > 0 && saved < goal) {
        tips.push({
          icon:  '🎯',
          title: 'Savings Goal In Progress',
          text:  `You've saved ₹${saved.toLocaleString()} so far. You need ₹${(goal - saved).toLocaleString()} more to reach your ₹${goal.toLocaleString()} savings goal.`,
        });
      }
    }

    // Prompt to set income if not set
    if (!income) {
      tips.push({
        icon:  '💡',
        title: 'Set Your Monthly Income',
        text:  'Go to Profile → Financial Settings to set your monthly income. This enables real savings tracking and better insights.',
      });
    }

    return tips;
  });
}
