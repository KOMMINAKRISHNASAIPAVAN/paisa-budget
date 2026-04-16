import { Component, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-daily',
  imports: [FormsModule],
  templateUrl: './daily.html',
  styleUrl: './daily.scss',
})
export class Daily {
  Math = Math;
  private data = inject(DataService);

  // ── Form ─────────────────────────────────────────────────
  form = {
    description: '',
    amount:      null as number | null,
    note:        '',
    entryType:   'EXPENSE' as 'EXPENSE' | 'INCOME',
    entryDate:   new Date().toLocaleDateString('en-CA'),
  };
  saving    = signal(false);
  formError = signal('');

  // ── Month picker ─────────────────────────────────────────
  availableMonths = computed(() => {
    const now  = new Date();
    const list: { value: string; label: string; month: number; year: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({
        value: `${d.getFullYear()}-${d.getMonth() + 1}`,
        label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
        month: d.getMonth() + 1,
        year:  d.getFullYear(),
      });
    }
    return list;
  });

  selectedMonthVal = signal(
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${now.getMonth() + 1}`;
    })()
  );

  selectedMonthMeta = computed(() =>
    this.availableMonths().find(m => m.value === this.selectedMonthVal())
  );

  // ── Filtered entries for selected month ──────────────────
  monthEntries = computed(() => {
    const meta = this.selectedMonthMeta();
    if (!meta) return this.data.dailyEntries();
    return this.data.dailyEntries().filter(e =>
      e.entryDate.includes(MONTH_LABELS[meta.month - 1]) &&
      e.entryDate.includes(String(meta.year))
    );
  });

  monthIncome  = computed(() =>
    this.monthEntries().filter(e => e.entryType === 'INCOME').reduce((s, e) => s + e.amount, 0)
  );
  monthSpent   = computed(() =>
    this.monthEntries().filter(e => e.entryType === 'EXPENSE').reduce((s, e) => s + e.amount, 0)
  );
  monthBalance = computed(() => this.monthIncome() - this.monthSpent());

  // Today's spend only
  todaySpent = computed(() => {
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    return this.data.dailyEntries()
      .filter(e => e.entryDate === today && e.entryType === 'EXPENSE')
      .reduce((s, e) => s + e.amount, 0);
  });

  // Group by date for display
  grouped = computed(() => {
    const map = new Map<string, { id: string; description: string; amount: number; note: string; entryType: 'INCOME' | 'EXPENSE'; entryDate: string }[]>();
    for (const e of this.monthEntries()) {
      const list = map.get(e.entryDate) ?? [];
      list.push(e);
      map.set(e.entryDate, list);
    }
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      items,
      dayIncome: items.filter(i => i.entryType === 'INCOME').reduce((s, i) => s + i.amount, 0),
      daySpent:  items.filter(i => i.entryType === 'EXPENSE').reduce((s, i) => s + i.amount, 0),
    }));
  });

  // ── Add entry ─────────────────────────────────────────────
  async addEntry() {
    this.formError.set('');
    if (!this.form.description.trim()) { this.formError.set('Description is required.'); return; }
    if (!this.form.amount || this.form.amount <= 0) { this.formError.set('Enter a valid amount.'); return; }

    this.saving.set(true);
    const result = await this.data.addDailyEntry({
      description: this.form.description.trim(),
      amount:      this.form.amount,
      note:        this.form.note.trim(),
      entryType:   this.form.entryType,
      entryDate:   this.form.entryDate,
    });
    this.saving.set(false);

    if (result.ok) {
      this.form.description = '';
      this.form.amount      = null;
      this.form.note        = '';
      this.form.entryDate   = new Date().toLocaleDateString('en-CA');
    } else {
      this.formError.set(result.error ?? 'Failed to add entry.');
    }
  }

  deleteEntry(id: string) {
    this.data.deleteDailyEntry(id);
  }
}
