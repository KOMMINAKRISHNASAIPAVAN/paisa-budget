import { Component, computed, inject } from '@angular/core';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  Math = Math;
  private data = inject(DataService);
  private auth = inject(AuthService);

  budgets = computed(() => this.data.budgets().filter(b => b.active));
  recentTransactions = this.data.recentExpenses;
  monthlyExpense = this.data.thisMonthTotal;

  totalBudget = computed(() =>
    this.data.budgets().filter(b => b.active).reduce((s, b) => s + b.limit, 0)
  );

  monthlyIncome  = computed(() => this.auth.currentUser()?.monthlyIncome ?? 0);
  savingsGoal    = computed(() => this.auth.currentUser()?.savingsGoal ?? 0);

  // Income-based remaining; falls back to budget-based when income not set
  totalSavings = computed(() =>
    this.monthlyIncome() > 0
      ? this.monthlyIncome() - this.monthlyExpense()
      : this.totalBudget() - this.monthlyExpense()
  );

  savingsGoalProgress = computed(() => {
    const goal = this.savingsGoal();
    if (!goal) return 0;
    const saved = this.monthlyIncome() - this.monthlyExpense();
    return Math.min(Math.max(Math.round((saved / goal) * 100), 0), 100);
  });
}
