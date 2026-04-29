import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserAccount {
  id: number;
  name: string;
  phone: string;
  monthlyIncome: number;
  savingsGoal: number;
}

const TOKEN_KEY   = 'paisa_token';
const SESSION_KEY = 'paisa_session';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _user = signal<UserAccount | null>(this.loadSession());

  isLoggedIn  = computed(() => this._user() !== null);
  currentUser = computed(() => this._user());

  constructor(private http: HttpClient, private router: Router) {
    if (this.loadSession()) this.refreshUser();
  }

  async refreshUser() {
    if (!this.getToken()) return;
    try {
      const user: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${this.getToken()}` }
        })
      );
      this.saveSession(this.getToken()!, { id: user.id, name: user.name, phone: user.phone, monthlyIncome: user.monthlyIncome ?? 0, savingsGoal: user.savingsGoal ?? 0 });
    } catch { }
  }

  async register(name: string, phone: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/auth/register`, { name, phone, password })
      );
      this.saveSession(res.token, { id: res.id, name: res.name, phone: res.phone, monthlyIncome: res.monthlyIncome ?? 0, savingsGoal: res.savingsGoal ?? 0 });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.error?.message ?? 'Registration failed. Please try again.' };
    }
  }

  async login(phone: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/auth/login`, { phone, password })
      );
      this.saveSession(res.token, { id: res.id, name: res.name, phone: res.phone, monthlyIncome: res.monthlyIncome ?? 0, savingsGoal: res.savingsGoal ?? 0 });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.error?.message ?? 'Invalid phone or password.' };
    }
  }

  async updateName(name: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.put(`${environment.apiUrl}/api/auth/update-name`, { name },
          { headers: { Authorization: `Bearer ${this.getToken()}` } })
      );
      // Update token + session from backend response
      this.saveSession(res.token, { id: res.id, name: res.name, phone: res.phone, monthlyIncome: res.monthlyIncome ?? 0, savingsGoal: res.savingsGoal ?? 0 });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.error?.message ?? 'Failed to update name.' };
    }
  }

  async updateFinancial(monthlyIncome: number, savingsGoal: number): Promise<{ ok: boolean; error?: string }> {
    try {
      const res: any = await firstValueFrom(
        this.http.put(`${environment.apiUrl}/api/auth/update-financial`, { monthlyIncome, savingsGoal },
          { headers: { Authorization: `Bearer ${this.getToken()}` } })
      );
      this.saveSession(res.token, { id: res.id, name: res.name, phone: res.phone, monthlyIncome: res.monthlyIncome ?? 0, savingsGoal: res.savingsGoal ?? 0 });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.error?.message ?? 'Failed to update financial settings.' };
    }
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private saveSession(token: string, user: UserAccount) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private loadSession(): UserAccount | null {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const s     = localStorage.getItem(SESSION_KEY);
      if (!token || !s) return null;
      const p = JSON.parse(s);
      return p.id && p.name ? p : null;
    } catch { return null; }
  }
}
