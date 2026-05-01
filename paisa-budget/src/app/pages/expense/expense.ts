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
  expenses    = this.data.expenses;
  monthFilter = signal<'thisMonth' | 'all'>('thisMonth');

  private get currentMonthShort() {
    const now = new Date();
    return now.toLocaleString('default', { month: 'short' });
  }
  private get currentYear() { return String(new Date().getFullYear()); }

  filteredExpenses = computed(() => {
    let list = this.data.expenses();

    if (this.monthFilter() === 'thisMonth') {
      const m = this.currentMonthShort;
      const y = this.currentYear;
      list = list.filter(e => e.date.includes(m) && e.date.includes(y));
    }

    const cat     = this.filterCat();
    const dateVal = this.filterDate();
    if (cat !== 'All') list = list.filter(e => e.category === cat);
    if (dateVal)       list = list.filter(e => e.date === this.formatDate(dateVal));
    return list;
  });

  thisMonthExpenses = computed(() => {
    const m = this.currentMonthShort;
    const y = this.currentYear;
    return this.data.expenses().filter(e => e.date.includes(m) && e.date.includes(y));
  });

  thisMonthTotal = computed(() => this.thisMonthExpenses().reduce((s, e) => s + e.amount, 0));
  totalAmount    = computed(() => this.filteredExpenses().reduce((s, e) => s + e.amount, 0));
  todayAmount    = this.data.todayTotal;

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

  // Pre-process image: grayscale + high contrast + threshold
  // Removes light-coloured stamps/watermarks and improves OCR accuracy
  private preprocessImage(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        // Scale down if too large (OCR accuracy peaks around 2000px wide)
        const MAX = 2000;
        const scale = img.width > MAX ? MAX / img.width : 1;
        const w = Math.round(img.width  * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
          // Convert to grayscale
          let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          // Boost contrast
          g = Math.min(255, Math.max(0, (g - 128) * 1.8 + 128));
          // Binary threshold — anything above 145 becomes white
          g = g > 145 ? 255 : 0;
          d[i] = d[i + 1] = d[i + 2] = g;
        }

        ctx.putImageData(imgData, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = url;
    });
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

      // Pre-process: remove watermark/stamp, sharpen text
      const canvas = await this.preprocessImage(file);
      const { data: { text } } = await worker.recognize(canvas);
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

    // ── Step 1: Clean the raw OCR text ────────────────────
    const cleanLines = text.split('\n')
      .filter(line => {
        const l = line.toLowerCase();
        // Drop lines with contact/phone keywords
        return !/(whatsapp|phone|mobile|tel:|fax|contact|helpline|call us|sms|appointment|timings|mon-|sun-)/.test(l);
      });

    const cleanedText = cleanLines.join('\n')
      .replace(/\+91[\s\-]?[\d\s\-]{8,14}/g, '')     // remove +91 numbers
      .replace(/\b[6-9]\d{9}\b/g, '')                  // remove 10-digit mobiles
      .replace(/\b(\d+)\s(\d{3})\b/g, '$1$2');         // merge "11 000" → "11000"

    const lower = cleanedText.toLowerCase();

    // ── Step 2: Amount — line-by-line keyword search ──────
    // Split into lines and look for total/amount keywords,
    // then grab the rightmost number on that line OR the number on the next line.
    let amount: number | null = null;
    const cLines = cleanedText.split('\n');

    const totalKeywords = /total\s*amount|grand\s*total|net\s*amount|amount\s*paid|amount\s*due|net\s*payable|balance\s*due|payable|subtotal|total/i;

    for (let i = 0; i < cLines.length; i++) {
      if (!totalKeywords.test(cLines[i])) continue;

      // Try rightmost number on this line
      const nums = [...cLines[i].matchAll(/([0-9,]+(?:\.[0-9]{1,2})?)/g)]
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(n => n >= 50 && n <= 500000 && !(n >= 1990 && n <= 2100));
      if (nums.length > 0) { amount = nums[nums.length - 1]; break; }

      // Try number at the start of the next line
      if (i + 1 < cLines.length) {
        const nextNum = cLines[i + 1].match(/^\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
        if (nextNum) {
          const val = parseFloat(nextNum[1].replace(/,/g, ''));
          if (val >= 50 && val <= 500000 && !(val >= 1990 && val <= 2100)) {
            amount = val; break;
          }
        }
      }
    }

    // ── Step 3: Amount — right-aligned column numbers ─────
    // Bills often show amounts right-aligned at end of lines:
    // "Root Canal Treatment    11000" or "Amount Paid    11000"
    if (!amount) {
      const rightNums = cLines
        .map(line => {
          const m = line.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*$/);
          if (!m) return null;
          return parseFloat(m[1].replace(/,/g, ''));
        })
        .filter((n): n is number =>
          n !== null && !isNaN(n) && n >= 100 && n <= 500000 && !(n >= 1990 && n <= 2100)
        );
      if (rightNums.length > 0) amount = Math.max(...rightNums);
    }

    // ── Step 4: Amount — ₹ / Rs symbol fallback ──────────
    if (!amount) {
      const rupeeMatch = cleanedText.match(/[₹]\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (rupeeMatch) {
        const val = parseFloat(rupeeMatch[1].replace(/,/g, ''));
        if (val >= 50) amount = val;
      }
    }
    if (!amount) {
      const rsMatch = cleanedText.match(/Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
      if (rsMatch) {
        const val = parseFloat(rsMatch[1].replace(/,/g, ''));
        if (val >= 50) amount = val;
      }
    }

    // ── Step 5: Amount — largest valid number fallback ────
    if (!amount) {
      const nums = [...cleanedText.matchAll(/\b([0-9,]+(?:\.[0-9]{1,2})?)\b/g)]
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(n => !isNaN(n) && n >= 100 && n <= 500000 && !(n >= 1990 && n <= 2100));
      if (nums.length > 0) amount = Math.max(...nums);
    }

    // ── Step 5: Description — skip header/logo garbage ───
    const skipWords = ['tax', 'gst', 'total', 'amount', 'bill', 'invoice',
      'receipt', 'thank', 'date', 'time', 'phone', 'address', 'cash', 'card',
      'payment', 'subtotal', 'discount', 'patient', 'information', 'name:',
      'surgery', 'pvt', 'ltd'];
    let description = '';

    // Skip first 2 lines (usually logo/clinic name with OCR noise), start from line 3
    const descLines = cleanLines.slice(2);
    for (const line of descLines) {
      const l = line.trim();
      if (l.length < 4) continue;
      if (skipWords.some(w => l.toLowerCase().includes(w))) continue;
      if (/^[\d\s:₹%.,/\-()]+$/.test(l)) continue;   // only numbers/punctuation
      if (/^\W+$/.test(l)) continue;                   // only symbols
      const cleaned = l.replace(/[^a-zA-Z0-9\s&'\-]/g, '').trim();
      if (cleaned.length >= 3 && /[a-zA-Z]/.test(cleaned)) {
        description = cleaned;
        break;
      }
    }

    // ── Step 6: Category detection ────────────────────────
    const fullLower = text.toLowerCase();
    let category = 'Shopping';

    if (/dental|canal|tooth|teeth|orthodon|endodon|periodon|oral|jaw|maxillo/.test(fullLower)) {
      category = 'Health';
    } else if (/swiggy|zomato|restaurant|cafe|food|pizza|burger|biryani|hotel|dhaba|eatery|kitchen|tiffin|bakery|domino|kfc|mcdonald|subway|canteen/.test(fullLower)) {
      category = 'Food';
    } else if (/uber|ola|rapido|petrol|fuel|diesel|redbus|irctc|railway|metro|bus|auto|cab|parking|toll/.test(fullLower)) {
      category = 'Transport';
    } else if (/apollo|medplus|pharmacy|hospital|clinic|medical|medicine|doctor|health|diagnostic|lab|pathology|wellness/.test(fullLower)) {
      category = 'Health';
    } else if (/pvr|inox|bookmyshow|movie|cinema|netflix|hotstar|prime|game|entertainment|sport/.test(fullLower)) {
      category = 'Entertainment';
    } else if (/school|college|university|book|stationery|course|tuition|coaching|education|fee|library/.test(fullLower)) {
      category = 'Education';
    } else if (/amazon|flipkart|myntra|mall|mart|supermarket|bigbazaar|dmart|reliance|store|shop|retail|grocer/.test(fullLower)) {
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
