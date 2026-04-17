import { Component, computed, inject } from '@angular/core';
import { DataService } from '../../services/data.service';
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

  // Budget progress (active budgets only)
  budgets = computed(() => this.data.budgets().filter(b => b.active));

  // Recent 5 expenses shown as transactions
  recentTransactions = this.data.recentExpenses;

  // Summary stats
  monthlyExpense = this.data.thisMonthTotal;

  totalBudget = computed(() =>
    this.data.budgets().filter(b => b.active).reduce((s, b) => s + b.limit, 0)
  );

  totalSavings = computed(() => this.totalBudget() - this.monthlyExpense());
}
