import { Component, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService, ExpenseItem } from '../../services/data.service';

@Component({
  selector: 'app-expense',
  imports: [FormsModule],
  templateUrl: './expense.html',
  styleUrl: './expense.scss',
})
export class Expense {
  private data = inject(DataService);

  showModal  = signal(false);
  editMode   = signal(false);
  editingId  = signal<string | null>(null);
  saving     = signal(false);
  formError  = signal('');
  filterCat  = signal('All');
  filterDate = signal('');

  form = {
    icon:        '🛒',
    description: '',
    category:    'Food',
    amount:      null as number | null,
    payment:     'UPI',
    date:        new Date().toLocaleDateString('en-CA'),
    budgetType:  'monthly' as 'monthly' | 'weekly',
  };

  categories = ['Food', 'Transport', 'Shopping', 'Health', 'Entertainment',
                'Utilities', 'Education', 'Fitness', 'Travel', 'Other'];
  payments   = ['UPI', 'Card', 'Cash', 'Wallet', 'Net Banking'];

  categoryIcons: Record<string, string> = {
    Food: '🛒', Transport: '🚗', Shopping: '🛍️', Health: '💊',
    Entertainment: '🎬', Utilities: '💡', Education: '📚',
    Fitness: '🏋️', Travel: '✈️', Other: '💸',
  };

  // Read directly from DataService
  expenses = this.data.expenses;

  filteredExpenses = computed(() => {
    let list      = this.data.expenses();
    const cat     = this.filterCat();
    const dateVal = this.filterDate();
    if (cat !== 'All') list = list.filter(e => e.category === cat);
    if (dateVal)       list = list.filter(e => e.date === this.formatDate(dateVal));
    return list;
  });

  totalAmount = computed(() => this.filteredExpenses().reduce((s, e) => s + e.amount, 0));
  todayAmount = this.data.todayTotal;

  openModal() {
    this.form = {
      icon: '🛒', description: '', category: 'Food',
      amount: null, payment: 'UPI',
      date: new Date().toLocaleDateString('en-CA'),
      budgetType: 'monthly',
    };
    this.editMode.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.showModal.set(true);
  }

  openEditModal(e: ExpenseItem) {
    this.form = {
      icon:        e.icon,
      description: e.description,
      category:    e.category,
      amount:      e.amount,
      payment:     e.payment,
      date:        this.toInputDate(e.date),
      budgetType:  e.budgetType,
    };
    this.editMode.set(true);
    this.editingId.set(e.id);
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  async deleteExpense(e: ExpenseItem) {
    await this.data.deleteExpense(e.id);
  }

  onCategoryChange() {
    this.form.icon = this.categoryIcons[this.form.category] ?? '💸';
  }

  async submitExpense() {
    this.formError.set('');
    if (!this.form.description.trim())             { this.formError.set('Description is required.'); return; }
    if (!this.form.amount || this.form.amount <= 0) { this.formError.set('Enter a valid amount.'); return; }
    if (!this.form.date)                           { this.formError.set('Date is required.'); return; }

    this.saving.set(true);

    if (this.editMode() && this.editingId()) {
      const result = await this.data.updateExpense(this.editingId()!, {
        icon:        this.form.icon,
        description: this.form.description.trim(),
        category:    this.form.category,
        date:        this.formatDate(this.form.date),
        payment:     this.form.payment,
        amount:      this.form.amount!,
        budgetType:  this.form.budgetType,
      });
      this.saving.set(false);
      if (result.ok) this.closeModal();
      else this.formError.set(result.error ?? 'Failed to update.');
    } else {
      const newExpense: ExpenseItem = {
        id:          crypto.randomUUID(),
        icon:        this.form.icon,
        description: this.form.description.trim(),
        category:    this.form.category,
        date:        this.formatDate(this.form.date),
        payment:     this.form.payment,
        amount:      this.form.amount!,
        budgetType:  this.form.budgetType,
      };
      await this.data.addExpense(newExpense);
      this.saving.set(false);
      this.closeModal();
    }
  }

  private formatDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private toInputDate(dateStr: string): string {
    // "16 Apr 2026" → "2026-04-16"
    try {
      const months: Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
      };
      const parts = dateStr.trim().split(' ');
      if (parts.length === 3) {
        return `${parts[2]}-${months[parts[1]] ?? '01'}-${parts[0].padStart(2, '0')}`;
      }
      return new Date().toLocaleDateString('en-CA');
    } catch {
      return new Date().toLocaleDateString('en-CA');
    }
  }
}
