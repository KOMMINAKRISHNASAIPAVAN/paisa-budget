import { Component, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService, ExpenseItem } from '../../services/data.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-expense',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './expense.html',
  styleUrl: './expense.scss',
})
export class Expense {
  private data = inject(DataService);

  today      = new Date().toLocaleDateString('en-CA');
  showModal  = signal(false);
  editMode   = signal(false);
  editingId  = signal<string | null>(null);
  saving     = signal(false);
  formError  = signal('');
  filterCat  = signal('All');
  filterDate = signal('');

  // ── Scanner state ─────────────────────────────────────────
  scanning     = signal(false);
  scanProgress = signal(0);
  scanError    = signal('');

  payments = ['UPI', 'Card', 'Cash', 'Wallet', 'Net Banking'];

  // Categories come from active budgets — unique per category name
  budgetCategories = computed(() => {
    const map = new Map<string, { category: string; icon: string; types: Set<'monthly' | 'weekly'> }>();
    for (const b of this.data.budgets().filter(b => b.active)) {
      if (!map.has(b.category)) {
        map.set(b.category, { category: b.category, icon: b.icon, types: new Set([b.type]) });
      } else {
        map.get(b.category)!.types.add(b.type);
      }
    }
    return Array.from(map.values());
  });

  form = {
    icon:        '🛒',
    description: '',
    category:    '',
    amount:      null as number | null,
    payment:     'UPI',
    date:        new Date().toLocaleDateString('en-CA'),
    budgetType:  'monthly' as 'monthly' | 'weekly',
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
    const first = this.budgetCategories()[0];
    this.form = {
      icon:        first?.icon ?? '💸',
      description: '',
      category:    first?.category ?? '',
      amount:      null,
      payment:     'UPI',
      date:        new Date().toLocaleDateString('en-CA'),
      budgetType:  first ? [...first.types][0] : 'monthly',
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
    const budgetCat = this.budgetCategories().find(c => c.category === this.form.category);
    this.form.icon = budgetCat?.icon ?? '💸';
    if (budgetCat?.types.size === 1) {
      this.form.budgetType = [...budgetCat.types][0];
    }
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

  // ── Bill Scanner ──────────────────────────────────────────

  openScanner() {
    this.scanError.set('');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.scanBill(file);
    };
    input.click();
  }

  async scanBill(file: File) {
    this.scanning.set(true);
    this.scanProgress.set(0);
    this.scanError.set('');

    try {
      const { createWorker } = await import('tesseract.js');

      const worker = await createWorker('eng', 1, {
        workerPath: 'worker.min.js',
        langPath:   'https://tessdata.projectnaptha.com/4.0.0',
        corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@7/tesseract-core-simd.wasm.js',
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            this.scanProgress.set(Math.round(m.progress * 100));
          }
        },
      } as any);

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const parsed = this.parseReceipt(text);

      // Match category against existing budgets, or fall back to first
      const first = this.budgetCategories()[0];
      const matched = this.budgetCategories().find(c =>
        c.category.toLowerCase().includes(parsed.category.toLowerCase()) ||
        parsed.category.toLowerCase().includes(c.category.toLowerCase())
      ) ?? first;

      this.form = {
        icon:        matched?.icon ?? '🧾',
        description: parsed.description,
        category:    matched?.category ?? first?.category ?? '',
        amount:      parsed.amount,
        payment:     'UPI',
        date:        new Date().toLocaleDateString('en-CA'),
        budgetType:  matched ? [...matched.types][0] : 'monthly',
      };

      this.editMode.set(false);
      this.editingId.set(null);
      this.formError.set('');
      this.showModal.set(true);

    } catch {
      this.scanError.set('Could not read the bill. Try a clearer photo.');
    } finally {
      this.scanning.set(false);
      this.scanProgress.set(0);
    }
  }

  private parseReceipt(text: string): { amount: number | null; description: string; category: string } {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
    const lower = text.toLowerCase();

    // ── Amount detection ──────────────────────────────────
    let amount: number | null = null;

    // Priority 1: total/grand total/net amount keywords
    const totalMatch = text.match(
      /(?:grand\s*total|total\s*amount|net\s*amount|amount\s*due|bill\s*total|payable|total)[:\s₹Rs.]*([0-9,]+(?:\.[0-9]{1,2})?)/i
    );
    if (totalMatch) {
      const val = parseFloat(totalMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) amount = val;
    }

    // Priority 2: ₹ symbol
    if (!amount) {
      const rupeeMatch = text.match(/₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (rupeeMatch) {
        const val = parseFloat(rupeeMatch[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) amount = val;
      }
    }

    // Priority 3: Rs. pattern
    if (!amount) {
      const rsMatch = text.match(/Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
      if (rsMatch) {
        const val = parseFloat(rsMatch[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) amount = val;
      }
    }

    // Priority 4: largest plausible number
    if (!amount) {
      const nums = [...text.matchAll(/\b([0-9,]+(?:\.[0-9]{1,2})?)\b/g)]
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(n => !isNaN(n) && n >= 10 && n <= 500000);
      if (nums.length > 0) amount = Math.max(...nums);
    }

    // ── Description detection ─────────────────────────────
    const skipWords = ['tax', 'gst', 'total', 'amount', 'bill', 'invoice',
      'receipt', 'thank', 'date', 'time', 'phone', 'address', 'cash', 'card'];
    let description = '';
    for (const line of lines.slice(0, 6)) {
      const l = line.toLowerCase();
      if (l.length < 3) continue;
      if (skipWords.some(w => l.includes(w))) continue;
      if (/^[0-9\s:₹%.,/-]+$/.test(line)) continue;
      description = line.replace(/[^a-zA-Z0-9\s&'.()\-]/g, '').trim();
      if (description.length >= 3) break;
    }

    // ── Category detection ────────────────────────────────
    let category = 'Shopping';

    if (/swiggy|zomato|restaurant|cafe|food|pizza|burger|biryani|hotel|dhaba|eatery|kitchen|tiffin|mess|bakery|domino|kfc|mcdonald|subway|barbeque|thirsting|canteen/.test(lower)) {
      category = 'Food';
    } else if (/uber|ola|rapido|petrol|fuel|diesel|redbus|irctc|railway|metro|bus|auto|cab|ticket|transport|parking|toll|ride/.test(lower)) {
      category = 'Transport';
    } else if (/apollo|medplus|pharmacy|hospital|clinic|medical|medicine|doctor|health|diagnostic|lab|pathology|wellness/.test(lower)) {
      category = 'Health';
    } else if (/pvr|inox|bookmyshow|movie|cinema|netflix|hotstar|prime|game|entertainment|sport|amusement/.test(lower)) {
      category = 'Entertainment';
    } else if (/school|college|university|book|stationery|course|tuition|coaching|education|fee|library/.test(lower)) {
      category = 'Education';
    } else if (/amazon|flipkart|myntra|mall|mart|supermarket|bigbazaar|dmart|reliance|store|shop|retail|grocer|vegetable|fruit/.test(lower)) {
      category = 'Shopping';
    }

    return { amount, description, category };
  }

  private formatDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private toInputDate(dateStr: string): string {
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
