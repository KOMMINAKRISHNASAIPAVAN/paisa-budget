import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth';
import { NotifStateService } from '../../services/notif-state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

type NotifType = 'alert' | 'tip' | 'achievement' | 'summary';

interface Notification {
  id: string;
  icon: string;
  title: string;
  text: string;
  type: NotifType;
  time: string;
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-notifications',
  imports: [TranslatePipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
  location           = inject(Location);
  private data       = inject(DataService);
  private auth       = inject(AuthService);
  private notifState = inject(NotifStateService);

  constructor() {
    this.notifState.markSeen();
  }

  activeFilter = signal<'all' | NotifType>('all');

  monthlyIncome = computed(() => this.auth.currentUser()?.monthlyIncome ?? 0);
  savingsGoal   = computed(() => this.auth.currentUser()?.savingsGoal ?? 0);

  private now = new Date();
  private todayLabel  = `Today, ${this.now.getDate()} ${MONTH_LABELS[this.now.getMonth()]}`;
  private monthLabel  = `${MONTH_LABELS[this.now.getMonth()]} ${this.now.getFullYear()}`;

  allNotifications = computed<Notification[]>(() => {
    const notifs: Notification[] = [];
    const budgets  = this.data.budgets().filter(b => b.active);
    const expenses = this.data.expenses();
    const income   = this.monthlyIncome();
    const goal     = this.savingsGoal();
    const spent    = this.data.thisMonthTotal();
    const today    = this.data.todayTotal();
    const weekly   = this.data.weeklyTotal();

    // ── Budget alerts ──────────────────────────────────────
    for (const b of budgets) {
      const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
      if (b.spent > b.limit) {
        notifs.push({
          id: `over-${b.id}`, icon: '🚨', type: 'alert',
          title: `${b.icon} ${b.category} Over Budget`,
          text: `You've exceeded your ${b.category} budget by ₹${(b.spent - b.limit).toLocaleString()}. Limit: ₹${b.limit.toLocaleString()}.`,
          time: this.todayLabel,
        });
      } else if (pct >= 90) {
        notifs.push({
          id: `warn-90-${b.id}`, icon: '⚠️', type: 'alert',
          title: `${b.icon} ${b.category} at 90%`,
          text: `You've used ${Math.round(pct)}% of your ₹${b.limit.toLocaleString()} ${b.category} budget. Only ₹${(b.limit - b.spent).toLocaleString()} left.`,
          time: this.todayLabel,
        });
      } else if (pct >= 75) {
        notifs.push({
          id: `warn-75-${b.id}`, icon: '⚡', type: 'alert',
          title: `${b.icon} ${b.category} at ${Math.round(pct)}%`,
          text: `Heads up — ${b.category} is at ${Math.round(pct)}% of budget. ₹${(b.limit - b.spent).toLocaleString()} remaining.`,
          time: this.monthLabel,
        });
      }
    }

    // ── Income vs spending alert ───────────────────────────
    if (income > 0 && spent > income) {
      notifs.push({
        id: 'over-income', icon: '🔴', type: 'alert',
        title: 'Spending Exceeds Monthly Income',
        text: `You've spent ₹${spent.toLocaleString()} against your income of ₹${income.toLocaleString()}. You're ₹${(spent - income).toLocaleString()} over.`,
        time: this.todayLabel,
      });
    }

    // ── Large transaction today ────────────────────────────
    const todayExpenses = expenses.filter(e => {
      const d = new Date();
      return e.date.includes(MONTH_LABELS[d.getMonth()]) && e.date.includes(String(d.getFullYear()));
    });
    const largeToday = todayExpenses.filter(e => e.amount >= 1000);
    for (const e of largeToday.slice(0, 3)) {
      notifs.push({
        id: `large-${e.id}`, icon: '💳', type: 'alert',
        title: `Large Transaction: ₹${e.amount.toLocaleString()}`,
        text: `${e.icon ?? '💸'} ${e.description} — ₹${e.amount.toLocaleString()} in ${e.category}.`,
        time: this.todayLabel,
      });
    }

    // ── Savings goal ───────────────────────────────────────
    if (goal > 0 && income > 0) {
      const saved = income - spent;
      const pct   = Math.round((saved / goal) * 100);
      if (saved >= goal) {
        notifs.push({
          id: 'goal-hit', icon: '🏆', type: 'achievement',
          title: 'Savings Goal Achieved!',
          text: `You've saved ₹${saved.toLocaleString()} this month, surpassing your ₹${goal.toLocaleString()} goal. Keep it up!`,
          time: this.monthLabel,
        });
      } else if (pct >= 50) {
        notifs.push({
          id: 'goal-halfway', icon: '🎯', type: 'achievement',
          title: `${pct}% of Savings Goal Reached`,
          text: `You've saved ₹${saved.toLocaleString()} so far. ₹${(goal - saved).toLocaleString()} more to reach your ₹${goal.toLocaleString()} goal.`,
          time: this.monthLabel,
        });
      }
    }

    // ── Achievements ───────────────────────────────────────
    if (expenses.length >= 10) {
      notifs.push({
        id: 'tracker-10', icon: '⭐', type: 'achievement',
        title: 'Active Tracker!',
        text: `You've logged ${expenses.length} expenses. Great habit of tracking your spending!`,
        time: this.monthLabel,
      });
    }

    if (budgets.length > 0 && budgets.every(b => b.spent <= b.limit)) {
      notifs.push({
        id: 'all-on-track', icon: '✅', type: 'achievement',
        title: 'All Budgets On Track',
        text: `Every active budget is within limit this month. Excellent financial discipline!`,
        time: this.monthLabel,
      });
    }

    // ── Monthly summary ────────────────────────────────────
    if (spent > 0) {
      notifs.push({
        id: 'monthly-summary', icon: '📊', type: 'summary',
        title: `${this.monthLabel} Spending Summary`,
        text: `Total spent: ₹${spent.toLocaleString()}${income > 0 ? ` | Income: ₹${income.toLocaleString()} | Saved: ₹${(income - spent).toLocaleString()}` : ''}.`,
        time: this.monthLabel,
      });
    }

    if (weekly > 0) {
      notifs.push({
        id: 'weekly-summary', icon: '📅', type: 'summary',
        title: 'This Week\'s Spending',
        text: `You've spent ₹${weekly.toLocaleString()} in the last 7 days.`,
        time: this.todayLabel,
      });
    }

    if (today > 0) {
      notifs.push({
        id: 'daily-summary', icon: '📓', type: 'summary',
        title: 'Today\'s Spending',
        text: `You've spent ₹${today.toLocaleString()} today across your tracked expenses.`,
        time: this.todayLabel,
      });
    }

    // ── Tips ───────────────────────────────────────────────
    if (!income) {
      notifs.push({
        id: 'set-income', icon: '💡', type: 'tip',
        title: 'Set Your Monthly Income',
        text: 'Go to Profile → Financial Settings to set your income. This enables savings tracking, real budget health scores, and better insights.',
        time: this.monthLabel,
      });
    }

    const hasInvest = budgets.some(b => b.category.toLowerCase() === 'invest');
    if (!hasInvest && budgets.length > 0) {
      notifs.push({
        id: 'invest-tip', icon: '📈', type: 'tip',
        title: 'Start an Investment Budget',
        text: "You haven't allocated any budget for investing. Even ₹500/week in SIP can build significant wealth over time.",
        time: this.monthLabel,
      });
    }

    const cats = this.data.expenses().reduce((map, e) => {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
      return map;
    }, new Map<string, number>());
    const topCat = Array.from(cats.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topCat && spent > 0 && (topCat[1] / spent) > 0.4) {
      notifs.push({
        id: 'top-cat-tip', icon: '🔍', type: 'tip',
        title: `Review ${topCat[0]} Spending`,
        text: `${topCat[0]} makes up ${Math.round((topCat[1] / spent) * 100)}% of your total expenses (₹${topCat[1].toLocaleString()}). Consider setting a stricter limit.`,
        time: this.monthLabel,
      });
    }

    return notifs;
  });

  filtered = computed(() => {
    const f = this.activeFilter();
    if (f === 'all') return this.allNotifications();
    return this.allNotifications().filter(n => n.type === f);
  });

  alertCount       = computed(() => this.allNotifications().filter(n => n.type === 'alert').length);
  achievementCount = computed(() => this.allNotifications().filter(n => n.type === 'achievement').length);
  tipCount         = computed(() => this.allNotifications().filter(n => n.type === 'tip').length);
  summaryCount     = computed(() => this.allNotifications().filter(n => n.type === 'summary').length);

  setFilter(f: 'all' | NotifType) { this.activeFilter.set(f); }

  typeLabel(type: NotifType): string {
    return { alert: 'Alert', tip: 'Tip', achievement: 'Achievement', summary: 'Summary' }[type];
  }

  typeBadgeColor(type: NotifType): string {
    return {
      alert:       'var(--danger)',
      tip:         'var(--accent)',
      achievement: '#f59e0b',
      summary:     'var(--success)',
    }[type];
  }
}
