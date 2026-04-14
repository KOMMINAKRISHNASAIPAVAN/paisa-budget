import { Component, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { DataService, Budget } from '../../services/data.service';

type PeriodFilter = 'all' | 'monthly' | 'weekly';

interface Allocation {
  icon: string;
  category: string;
  amount: number | null;
  customName?: string;
}

@Component({
  selector: 'app-budgets',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './budgets.html',
  styleUrl: './budgets.scss',
})
export class Budgets {
  Math = Math;
  private data = inject(DataService);

  activePeriod = signal<PeriodFilter>('all');
  showModal    = signal(false);
  step         = signal<1 | 2>(1);
  formError    = signal('');

  // ── Step 1 ───────────────────────────────────────────
  totalBudget = signal<number | null>(null);
  periodType  = signal<'monthly' | 'weekly'>('monthly');

  // ── Step 2 allocations ───────────────────────────────
  fixedCategories: Allocation[] = [
    { icon: '🍽️', category: 'Food',      amount: null },
    { icon: '🚗', category: 'Transport', amount: null },
    { icon: '🛍️', category: 'Shopping',  amount: null },
    { icon: '💊', category: 'Health',    amount: null },
    { icon: '🎬', category: 'Movies',    amount: null },
    { icon: '🏠', category: 'Rent',      amount: null },
    { icon: '📈', category: 'Invest',    amount: null },
    { icon: '💸', category: 'Other',     amount: null },
  ];

  allocations = signal<Allocation[]>(this.fixedCategories.map(c => ({ ...c })));

  totalAllocated = computed(() => this.allocations().reduce((s, a) => s + (a.amount ?? 0), 0));
  remaining      = computed(() => (this.totalBudget() ?? 0) - this.totalAllocated());
  remainingPct   = computed(() => {
    const t = this.totalBudget() ?? 0;
    return t ? Math.min((this.totalAllocated() / t) * 100, 100) : 0;
  });

  // ── Read from DataService (persisted) ───────────────
  filteredBudgets = computed(() => {
    const period = this.activePeriod();
    const list   = this.data.budgets();
    return period === 'all' ? list : list.filter(b => b.type === period);
  });

  monthlyBudgets = computed(() => this.data.budgets().filter(b => b.type === 'monthly'));
  weeklyBudgets  = computed(() => this.data.budgets().filter(b => b.type === 'weekly'));

  activeBudgets = computed(() => this.filteredBudgets().filter(b => b.active));
  summaryTotal  = computed(() => this.activeBudgets().reduce((s, b) => s + b.limit, 0));
  summarySpent  = computed(() => this.activeBudgets().reduce((s, b) => s + b.spent, 0));
  summaryLeft   = computed(() => this.summaryTotal() - this.summarySpent());

  setFilter(p: PeriodFilter) { this.activePeriod.set(p); }

  toggleActive(budget: Budget) { this.data.toggleBudget(budget.id); }
  deleteBudget(budget: Budget) { this.data.deleteBudget(budget.id); }

  // ── Modal ────────────────────────────────────────────
  openModal() {
    this.totalBudget.set(null);
    this.periodType.set('monthly');
    this.allocations.set(this.fixedCategories.map(c => ({ ...c, amount: null })));
    this.formError.set('');
    this.step.set(1);
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  goToStep2() {
    this.formError.set('');
    const total = this.totalBudget();
    if (!total || total <= 0) { this.formError.set('Please enter a valid total budget amount.'); return; }
    this.step.set(2);
  }

  goBack() { this.formError.set(''); this.step.set(1); }

  updateAllocation(index: number, value: number | null) {
    this.allocations.update(list => list.map((a, i) => i === index ? { ...a, amount: value } : a));
  }

  updateCustomName(index: number, name: string) {
    this.allocations.update(list => list.map((a, i) => i === index ? { ...a, customName: name } : a));
  }


  saving = signal(false);

  async submitBudget() {
    this.formError.set('');
    const filled = this.allocations().filter(a => a.amount && a.amount > 0);
    if (filled.length === 0) { this.formError.set('Please enter a limit for at least one category.'); return; }

    const otherRow = filled.find(a => a.category === 'Other');
    if (otherRow && !otherRow.customName?.trim()) {
      this.formError.set('Please enter a name for your "Other" category.'); return;
    }
    if (this.remaining() < 0) { this.formError.set('Total allocated exceeds your budget. Please adjust.'); return; }

    const now    = new Date();
    const period = this.periodType() === 'monthly'
      ? now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear()
      : 'Week ' + this.getWeekNumber(now) + ' (current)';

    const newBudgets: Budget[] = filled.map(a => ({
      id:       crypto.randomUUID(),
      icon:     a.icon,
      category: a.category === 'Other' ? a.customName!.trim() : a.category,
      type:     this.periodType(),
      period,
      spent:    0,
      limit:    a.amount!,
      status:   'On Track',
      active:   true,
    }));

    this.saving.set(true);
    const result = await this.data.addBudgets(newBudgets);
    this.saving.set(false);

    if (result.ok) {
      this.closeModal();
    } else {
      this.formError.set(result.error ?? 'Failed to save. Please try again.');
    }
  }

  private getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}
