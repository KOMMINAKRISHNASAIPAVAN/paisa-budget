import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private auth   = inject(AuthService);
  private router = inject(Router);

  // Signals so computed() can track changes
  name        = signal('');
  phone       = signal('');
  password    = signal('');
  confirmPass = signal('');

  showPass    = signal(false);
  showConfirm = signal(false);
  error       = signal('');
  loading     = signal(false);

  touchedName    = signal(false);
  touchedPhone   = signal(false);
  touchedPass    = signal(false);
  touchedConfirm = signal(false);

  // ── Name validation ──────────────────────────────────
  nameValid = computed(() =>
    this.name().trim().length >= 2 && /^[a-zA-Z\s]+$/.test(this.name().trim())
  );
  nameError = computed(() => {
    const n = this.name().trim();
    if (!n)                             return 'Name is required.';
    if (n.length < 2)                   return 'Name must be at least 2 characters.';
    if (!/^[a-zA-Z\s]+$/.test(n))      return 'Name can only contain letters and spaces.';
    return '';
  });

  // ── Phone validation ─────────────────────────────────
  phoneValid = computed(() => /^[6-9]\d{9}$/.test(this.phone().trim()));
  phoneError = computed(() => {
    const p = this.phone().trim();
    if (!p)                      return 'Phone number is required.';
    if (!/^\d+$/.test(p))        return 'Only digits are allowed.';
    if (p.length !== 10)         return 'Must be exactly 10 digits.';
    if (!/^[6-9]/.test(p))       return 'Must start with 6, 7, 8, or 9.';
    return '';
  });

  // ── Password strength ────────────────────────────────
  passChecks = computed(() => ({
    length:  this.password().length >= 8,
    upper:   /[A-Z]/.test(this.password()),
    lower:   /[a-z]/.test(this.password()),
    number:  /\d/.test(this.password()),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(this.password()),
  }));

  passScore = computed(() =>
    Object.values(this.passChecks()).filter(Boolean).length
  );

  passStrengthLabel = computed(() => {
    const s = this.passScore();
    if (s <= 2) return 'Weak';
    if (s <= 3) return 'Fair';
    if (s <= 4) return 'Good';
    return 'Strong';
  });

  passStrengthColor = computed(() => {
    const s = this.passScore();
    if (s <= 2) return '#ef4444';
    if (s <= 3) return '#f59e0b';
    if (s <= 4) return '#3b82f6';
    return '#10b981';
  });

  passValid = computed(() =>
    this.passScore() >= 3 && this.passChecks().length
  );

  confirmValid = computed(() =>
    this.password().length > 0 &&
    this.password() === this.confirmPass()
  );

  async submit() {
    this.error.set('');
    this.touchedName.set(true);
    this.touchedPhone.set(true);
    this.touchedPass.set(true);
    this.touchedConfirm.set(true);

    if (!this.nameValid())    { this.error.set(this.nameError()); return; }
    if (!this.phoneValid())   { this.error.set(this.phoneError()); return; }
    if (!this.passValid())    { this.error.set('Password is too weak. Meet at least 3 requirements including minimum 8 characters.'); return; }
    if (!this.confirmValid()) { this.error.set('Passwords do not match.'); return; }

    this.loading.set(true);
    const result = await this.auth.register(
      this.name().trim(), this.phone().trim(), this.password()
    );
    this.loading.set(false);

    if (result.ok) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set(result.error ?? 'Registration failed.');
    }
  }

  onPhoneInput(val: string) {
    this.phone.set(val.replace(/\D/g, '').slice(0, 10));
  }
}
