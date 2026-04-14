import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth   = inject(AuthService);
  private router = inject(Router);

  phone    = '';
  password = '';
  showPass = signal(false);
  error    = signal('');
  loading  = signal(false);

  async submit() {
    this.error.set('');

    if (!this.phone.trim())     { this.error.set('Please enter your phone number.'); return; }
    if (this.phone.length < 10) { this.error.set('Enter a valid 10-digit phone number.'); return; }
    if (!this.password)          { this.error.set('Please enter your password.'); return; }

    this.loading.set(true);
    const result = await this.auth.login(this.phone.trim(), this.password);
    this.loading.set(false);

    if (result.ok) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set(result.error ?? 'Login failed.');
    }
  }
}
