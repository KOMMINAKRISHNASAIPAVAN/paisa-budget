import { Component, computed, signal, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import { DataService, Budget, BudgetHistory } from '../../services/data.service';
import { AuthService } from '../../services/auth';
import { TranslatePipe } from '../../pipes/translate.pipe';

type PeriodFilter = 'all' | 'monthly' | 'weekly';

interface Allocation {
  icon: string;
  category: string;
  amount: number | null;
  customName?: string;
}

@Component({
  selector: 'app-budgets',
  imports: [FormsModule, NgTemplateOutlet, TitleCasePipe, TranslatePipe],
  templateUrl: './budgets.html',
  styleUrl: './budgets.scss',
})
export class Budgets {
  Math = Math;
  data = inject(DataService);
  private auth = inject(AuthService);

  monthlyIncome = computed(() => this.auth.currentUser()?.monthlyIncome ?? 0);
  overIncome    = computed(() => this.monthlyIncome() > 0 && this.summaryTotal() > this.monthlyIncome());

  activePeriod = signal<PeriodFilter>('all');
  showModal    = signal(false);
  step         = signal<1 | 2 | 3>(1);
  formError    = signal('');

  // ── Quick Add Category ────────────────────────────────
  showQuickAdd = signal(false);
  quickSaving  = signal(false);
  quickError   = signal('');
  quickForm    = { icon: '✏️', category: '', type: 'monthly' as 'monthly' | 'weekly', amount: null as number | null };

  openQuickAdd() {
    this.quickForm = { icon: '✏️', category: '', type: 'monthly', amount: null };
    this.quickError.set('');
    this.showQuickAdd.set(true);
  }

  closeQuickAdd() { this.showQuickAdd.set(false); }

  async submitQuickAdd() {
    this.quickError.set('');
    if (!this.quickForm.category.trim()) { this.quickError.set('Category name is required.'); return; }
    if (!this.quickForm.amount || this.quickForm.amount <= 0) { this.quickError.set('Enter a valid limit amount.'); return; }

    const now  = new Date();
    const period = this.quickForm.type === 'monthly'
      ? `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`
      : `Week ${this.getWeekOfMonth(now)} · ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;

    const budget: Budget = {
      id:          crypto.randomUUID(),
      icon:        this.quickForm.icon || '✏️',
      category:    this.quickForm.category.trim(),
      type:        this.quickForm.type,
      period,
      spent:       0,
      limit:       this.quickForm.amount!,
      baseLimit:   this.quickForm.amount!,
      totalBudget: this.quickForm.amount!,
      status:      'On Track',
      active:      true,
    };

    this.quickSaving.set(true);
    const result = await this.data.addBudgets([budget]);
    this.quickSaving.set(false);
    if (result.ok) this.closeQuickAdd();
    else this.quickError.set(result.error ?? 'Failed to save.');
  }

  // ── Rollover ──────────────────────────────────────────
  showRollover    = signal(false);
  rolloverItems   = signal<{ budget: Budget; reason: 'week' | 'month' }[]>([]);
  rolloverChoices = signal<Record<string, boolean>>({});
  rolloverSaving  = signal(false);
  private rolledOverIds = new Set<string>();

  constructor() {
    effect(() => {
      const budgets = this.data.budgets();
      if (budgets.length > 0) {
        this.detectExpiredBudgets(budgets);
      }
    });
  }

  private detectExpiredBudgets(budgets: Budget[]) {
    if (this.showRollover()) return;  // don't re-detect while dialog is open

    const now               = new Date();
    const currentMonthLong  = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    const currentMonthShort = `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
    const currentWeek       = this.getWeekOfMonth(now);

    const items: { budget: Budget; reason: 'week' | 'month' }[] = [];

    for (const b of budgets) {
      if (!b.active) continue;
      if (this.rolledOverIds.has(b.id)) continue;

      if (b.type === 'monthly') {
        if (b.period !== currentMonthLong) items.push({ budget: b, reason: 'month' });
      } else {
        const monthPart    = b.period.match(/·\s*(.+)$/)?.[1]?.trim() ?? '';
        const monthExpired = monthPart !== '' && monthPart !== currentMonthShort;
        if (monthExpired) {
          items.push({ budget: b, reason: 'month' });
        } else {
          const budgetWeek = parseInt(b.period.match(/Week (\d+)/)?.[1] ?? '0');
          if (budgetWeek !== currentWeek) items.push({ budget: b, reason: 'week' });
        }
      }
    }

    if (items.length > 0) {
      this.rolloverItems.set(items);
      const choices: Record<string, boolean> = {};
      items.forEach(i => choices[i.budget.id] = true);
      this.rolloverChoices.set(choices);
      this.showRollover.set(true);
    }
  }

  toggleRolloverChoice(id: string) {
    this.rolloverChoices.update(c => ({ ...c, [id]: !c[id] }));
  }

  async submitRollover() {
    this.rolloverSaving.set(true);
    // Mark all IDs immediately so the effect won't re-detect them during async operations
    this.rolloverItems().forEach(i => this.rolledOverIds.add(i.budget.id));

    const choices = this.rolloverChoices();
    const now     = new Date();
    const monthLong  = now.toLocaleString('default', { month: 'long' });
    const monthShort = now.toLocaleString('default', { month: 'short' });
    const year       = now.getFullYear();
    const weekNum    = this.getWeekOfMonth(now);

    for (const { budget: b } of this.rolloverItems()) {
      const remaining      = b.limit - b.spent;
      const wantsCarryover = remaining > 0 && (choices[b.id] ?? true);
      const carryover      = wantsCarryover ? remaining : 0;
      const newPeriod      = b.type === 'monthly'
        ? `${monthLong} ${year}`
        : `Week ${weekNum} · ${monthShort} ${year}`;
      await this.data.rolloverBudget(b.id, carryover, newPeriod);
    }
    this.rolloverSaving.set(false);
    this.showRollover.set(false);
  }

  skipRollover() {
    this.rolloverItems().forEach(i => this.rolledOverIds.add(i.budget.id));
    this.showRollover.set(false);
  }

  rolloverReasonLabel(reason: 'week' | 'month'): string {
    return reason === 'week' ? 'Week Ended' : 'Month Ended';
  }

  rolloverReasonColor(reason: 'week' | 'month'): string {
    return reason === 'week' ? 'var(--accent)' : '#f59e0b';
  }

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
  ];

  allocations       = signal<Allocation[]>(this.fixedCategories.map(c => ({ ...c })));
  customAllocations = signal<Allocation[]>([]);

  effectiveBudget = computed(() => {
    const total = this.totalBudget() ?? 0;
    return this.periodType() === 'weekly' ? Math.round(total / 4) : total;
  });

  allAllocations = computed(() => [...this.allocations(), ...this.customAllocations()]);
  totalAllocated = computed(() => this.allAllocations().reduce((s, a) => s + (a.amount ?? 0), 0));
  remaining      = computed(() => this.effectiveBudget() - this.totalAllocated());
  remainingPct   = computed(() => {
    const e = this.effectiveBudget();
    return e ? Math.min((this.totalAllocated() / e) * 100, 100) : 0;
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

  // ── History ──────────────────────────────────────────
  historyByPeriod = computed(() => {
    const map = new Map<string, BudgetHistory[]>();
    for (const h of this.data.budgetHistory()) {
      const key = h.periodLabel || 'Unknown Period';
      const list = map.get(key) ?? [];
      list.push(h);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([period, items]) => ({ period, items }));
  });

  setFilter(p: PeriodFilter) { this.activePeriod.set(p); }

  toggleActive(budget: Budget) { this.data.toggleBudget(budget.id); }
  deleteBudget(budget: Budget) { this.data.deleteBudget(budget.id); }

  // ── Modal ────────────────────────────────────────────
  openModal() {
    this.totalBudget.set(null);
    this.periodType.set('monthly');
    this.allocations.set(this.fixedCategories.map(c => ({ ...c, amount: null })));
    this.customAllocations.set([]);
    this.formError.set('');
    this.step.set(1);
    this.showModal.set(true);
  }

  addCustomCategory() {
    this.customAllocations.update(list => [
      ...list,
      { icon: '✏️', category: 'Other', amount: null, customName: '' },
    ]);
  }

  removeCustomAllocation(index: number) {
    this.customAllocations.update(list => list.filter((_, i) => i !== index));
  }

  updateCustomAllocation(index: number, field: 'amount' | 'customName', value: any) {
    this.customAllocations.update(list =>
      list.map((a, i) => i === index ? { ...a, [field]: value } : a)
    );
  }

  closeModal() { this.showModal.set(false); }

  goToStep2() {
    this.formError.set('');
    const total = this.totalBudget();
    if (!total || total <= 0) { this.formError.set('Please enter a valid total budget amount.'); return; }
    this.step.set(2);
  }

  goToStep3() {
    this.formError.set('');
    this.step.set(3);
  }

  goBack() {
    this.formError.set('');
    if (this.step() === 3) this.step.set(2);
    else this.step.set(1);
  }

  updateAllocation(index: number, value: number | null) {
    this.allocations.update(list => list.map((a, i) => i === index ? { ...a, amount: value } : a));
  }

  saving = signal(false);

  async submitBudget() {
    this.formError.set('');

    // Validate custom allocations: each must have a name
    const badCustom = this.customAllocations().find(a => (a.amount && a.amount > 0) && !a.customName?.trim());
    if (badCustom) { this.formError.set('Please enter a name for all custom categories.'); return; }

    const filled = this.allAllocations().filter(a => a.amount && a.amount > 0);
    if (filled.length === 0) { this.formError.set('Please enter a limit for at least one category.'); return; }
    if (this.remaining() < 0) { this.formError.set('Total allocated exceeds your budget. Please adjust.'); return; }

    const now    = new Date();
    const period = this.periodType() === 'monthly'
      ? `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`
      : `Week ${this.getWeekOfMonth(now)} · ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;

    const newBudgets: Budget[] = filled.map(a => ({
      id:          crypto.randomUUID(),
      icon:        a.icon,
      category:    a.category === 'Other' && a.customName?.trim() ? a.customName.trim() : a.category,
      type:        this.periodType(),
      period,
      spent:       0,
      limit:       a.amount!,
      baseLimit:   a.amount!,
      totalBudget: this.totalBudget() ?? 0,
      status:      'On Track',
      active:      true,
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

  // Week 1–4 within the current month (resets every new month)
  private getWeekOfMonth(d: Date): number {
    return Math.ceil(d.getDate() / 7);
  }
}
