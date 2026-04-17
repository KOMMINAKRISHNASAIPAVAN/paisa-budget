import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { DataService } from '../../services/data.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-transactions',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class Transactions {
  Math     = Math;
  location = inject(Location);
  private data = inject(DataService);

  // ── Filters ────────────────────────────────────────────────
  searchText  = signal('');
  filterMonth = signal('all');   // 'all' | 'YYYY-Mon' e.g. '2026-Apr'
  filterType  = signal('all');   // 'all' | 'debit' (all expenses are debit for now)

  // ── Available months from expense data ────────────────────
  availableMonths = computed(() => {
    const months = new Set<string>();
    for (const e of this.data.expenses()) {
      // date format: "14 Apr 2026"
      const parts = e.date.split(' ');
      if (parts.length === 3) months.add(`${parts[2]}-${parts[1]}`);
    }
    return Array.from(months).sort((a, b) => {
      const [ay, am] = a.split('-');
      const [by, bm] = b.split('-');
      const aDate = new Date(`${am} 1, ${ay}`).getTime();
      const bDate = new Date(`${bm} 1, ${by}`).getTime();
      return bDate - aDate; // newest first
    }).map(v => {
      const [year, mon] = v.split('-');
      return { value: v, label: `${mon} ${year}` };
    });
  });

  // ── Filtered flat list ────────────────────────────────────
  private filtered = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    const month  = this.filterMonth();

    return this.data.expenses().filter(e => {
      // Month filter
      if (month !== 'all') {
        const parts = e.date.split(' ');
        const key = parts.length === 3 ? `${parts[2]}-${parts[1]}` : '';
        if (key !== month) return false;
      }
      // Search filter
      if (search && !e.description.toLowerCase().includes(search) &&
          !e.category.toLowerCase().includes(search) &&
          !e.payment.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    });
  });

  // ── Group filtered items by date ──────────────────────────
  filteredGrouped = computed(() => {
    const map = new Map<string, ReturnType<typeof this.data.expenses>[number][]>();
    for (const e of this.filtered()) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries())
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => {
        const parse = (d: string) => {
          const p = d.split(' ');
          return p.length === 3 ? new Date(`${p[1]} ${p[0]}, ${p[2]}`).getTime() : 0;
        };
        return parse(b.date) - parse(a.date);
      });
  });

  filteredCount = computed(() => this.filtered().length);

  // ── Budget summary (all budgets, unfiltered) ──────────────
  activeBudgets     = computed(() => this.data.budgets().filter(b => b.active));
  totalBudget       = computed(() => this.activeBudgets().reduce((s, b) => s + b.limit, 0));
  totalSpent        = computed(() => this.activeBudgets().reduce((s, b) => s + b.spent, 0));
  remainingBudget   = computed(() => this.totalBudget() - this.totalSpent());
  activeBudgetCount = computed(() => this.activeBudgets().length);
  overBudgetCount   = computed(() => this.activeBudgets().filter(b => b.spent > b.limit).length);
}
