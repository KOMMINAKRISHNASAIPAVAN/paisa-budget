import { Component, computed, inject } from '@angular/core';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-transactions',
  imports: [],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class Transactions {
  Math = Math;
  private data = inject(DataService);

  groupedTransactions = this.data.groupedByDate;

  activeBudgets   = computed(() => this.data.budgets().filter(b => b.active));
  totalBudget     = computed(() => this.activeBudgets().reduce((s, b) => s + b.limit, 0));
  totalSpent      = computed(() => this.activeBudgets().reduce((s, b) => s + b.spent, 0));
  remainingBudget = computed(() => this.totalBudget() - this.totalSpent());
  activeBudgetCount = computed(() => this.activeBudgets().length);
  overBudgetCount   = computed(() => this.activeBudgets().filter(b => b.spent > b.limit).length);
}
