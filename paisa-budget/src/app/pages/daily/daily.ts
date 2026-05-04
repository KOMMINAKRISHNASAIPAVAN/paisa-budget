import { Component, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-daily',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './daily.html',
  styleUrl: './daily.scss',
})
export class Daily {
  Math  = Math;
  today = new Date().toLocaleDateString('en-CA');  // YYYY-MM-DD for [max]
  private data = inject(DataService);

  // ── Form ─────────────────────────────────────────────────
  form = {
    description:  '',
    amount:       null as number | null,
    note:         '',
    entryType:    'EXPENSE' as 'EXPENSE' | 'INCOME',
    expenseDate:  new Date().toLocaleDateString('en-CA'),
    incomeDate:   new Date().toLocaleDateString('en-CA'),
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

  // Group by date, newest first
  grouped = computed(() => {
    const map = new Map<string, { id: string; description: string; amount: number; note: string; entryType: 'INCOME' | 'EXPENSE'; entryDate: string }[]>();
    for (const e of this.monthEntries()) {
      const list = map.get(e.entryDate) ?? [];
      list.push(e);
      map.set(e.entryDate, list);
    }
    return Array.from(map.entries())
      .map(([date, items]) => ({
        date,
        items,
        dayIncome: items.filter(i => i.entryType === 'INCOME').reduce((s, i) => s + i.amount, 0),
        daySpent:  items.filter(i => i.entryType === 'EXPENSE').reduce((s, i) => s + i.amount, 0),
      }))
      .sort((a, b) => this.parseEntryDate(b.date) - this.parseEntryDate(a.date));
  });

  private parseEntryDate(dateStr: string): number {
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const [day, mon, year] = dateStr.split(' ');
    return new Date(+year, months[mon] ?? 0, +day).getTime();
  }

  // ── Edit entry ────────────────────────────────────────────
  showEdit   = signal(false);
  editId     = signal('');
  editSaving = signal(false);
  editError  = signal('');
  editForm   = { description: '', amount: null as number | null, note: '', entryType: 'EXPENSE' as 'EXPENSE' | 'INCOME', entryDate: '' };

  openEdit(entry: { id: string; description: string; amount: number; note: string; entryType: 'INCOME' | 'EXPENSE'; entryDate: string }) {
    this.editId.set(entry.id);
    this.editForm = {
      description: entry.description,
      amount:      entry.amount,
      note:        entry.note,
      entryType:   entry.entryType,
      entryDate:   this.toInputDate(entry.entryDate),
    };
    this.editError.set('');
    this.showEdit.set(true);
  }

  closeEdit() { this.showEdit.set(false); }

  async saveEdit() {
    this.editError.set('');
    if (!this.editForm.description.trim()) { this.editError.set('Description is required.'); return; }
    if (!this.editForm.amount || this.editForm.amount <= 0) { this.editError.set('Enter a valid amount.'); return; }

    this.editSaving.set(true);
    const result = await this.data.updateDailyEntry(this.editId(), {
      description: this.editForm.description.trim(),
      amount:      this.editForm.amount,
      note:        this.editForm.note.trim(),
      entryType:   this.editForm.entryType,
      entryDate:   this.editForm.entryDate,
    });
    this.editSaving.set(false);
    if (result.ok) this.closeEdit();
    else this.editError.set(result.error ?? 'Failed to update entry.');
  }

  private toInputDate(dateStr: string): string {
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const [day, mon, year] = dateStr.split(' ');
    return `${year}-${months[mon] ?? '01'}-${day.padStart(2, '0')}`;
  }

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
      entryDate:   this.form.entryType === 'EXPENSE' ? this.form.expenseDate : this.form.incomeDate,
    });
    this.saving.set(false);

    if (result.ok) {
      this.form.description = '';
      this.form.amount      = null;
      this.form.note        = '';
      if (this.form.entryType === 'EXPENSE') {
        this.form.expenseDate = new Date().toLocaleDateString('en-CA');
      } else {
        this.form.incomeDate = new Date().toLocaleDateString('en-CA');
      }
    } else {
      this.formError.set(result.error ?? 'Failed to add entry.');
    }
  }

  deleteEntry(id: string) {
    this.data.deleteDailyEntry(id);
  }
}
