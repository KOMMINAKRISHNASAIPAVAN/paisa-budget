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
    };
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  onCategoryChange() {
    this.form.icon = this.categoryIcons[this.form.category] ?? '💸';
  }

  submitExpense() {
    this.formError.set('');
    if (!this.form.description.trim())             { this.formError.set('Description is required.'); return; }
    if (!this.form.amount || this.form.amount <= 0) { this.formError.set('Enter a valid amount.'); return; }
    if (!this.form.date)                           { this.formError.set('Date is required.'); return; }

    const newExpense: ExpenseItem = {
      id:          crypto.randomUUID(),
      icon:        this.form.icon,
      description: this.form.description.trim(),
      category:    this.form.category,
      date:        this.formatDate(this.form.date),
      payment:     this.form.payment,
      amount:      this.form.amount,
    };

    this.data.addExpense(newExpense);
    this.closeModal();
  }

  private formatDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
