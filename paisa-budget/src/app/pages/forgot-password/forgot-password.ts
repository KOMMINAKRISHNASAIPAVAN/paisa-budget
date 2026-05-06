import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private http   = inject(HttpClient);
  private router = inject(Router);

  // Step 1
  phone   = '';
  step    = signal<1 | 2>(1);
  loading = signal(false);
  error   = signal('');

  // Step 2
  otp         = signal('');   // OTP received from backend (shown on screen)
  otpInput    = '';           // What the user types
  newPassword = '';
  showPass    = signal(false);
  success     = signal(false);

  sendOtp() {
    this.error.set('');
    if (!this.phone.trim() || this.phone.length < 10) {
      this.error.set('Enter a valid 10-digit phone number.');
      return;
    }
    this.loading.set(true);
    this.http
      .post<{ message: string; otp: string }>(
        `${environment.apiUrl}/api/auth/forgot-password`,
        { phone: this.phone.trim() }
      )
      .subscribe({
        next: res => {
          this.otp.set(res.otp);
          this.loading.set(false);
          this.step.set(2);
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err.error?.message ?? err.error ?? 'Phone number not found.');
        },
      });
  }

  resetPassword() {
    this.error.set('');
    if (!this.otpInput.trim()) { this.error.set('Enter the OTP.'); return; }
    if (this.newPassword.length < 8) { this.error.set('Password must be at least 8 characters.'); return; }

    this.loading.set(true);
    this.http
      .post<{ message: string }>(
        `${environment.apiUrl}/api/auth/reset-password`,
        { phone: this.phone.trim(), otp: this.otpInput.trim(), newPassword: this.newPassword }
      )
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err.error?.message ?? err.error ?? 'Invalid or expired OTP.');
        },
      });
  }

  back() {
    this.step.set(1);
    this.error.set('');
    this.otp.set('');
    this.otpInput = '';
    this.newPassword = '';
  }
}
