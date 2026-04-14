import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

export interface UserAccount {
  id: number;
  name: string;
  phone: string;
}

interface StoredUser {
  id: number;
  name: string;
  phone: string;
  password: string;
}

const USERS_KEY   = 'paisa_users';
const SESSION_KEY = 'paisa_session';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _user = signal<UserAccount | null>(this.loadSession());

  isLoggedIn  = computed(() => this._user() !== null);
  currentUser = computed(() => this._user());

  constructor(private router: Router) {}

  async register(name: string, phone: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const users: StoredUser[] = this.getUsers();
    if (users.find(u => u.phone === phone)) {
      return { ok: false, error: 'Phone number already registered. Please login.' };
    }
    const id  = Date.now();
    const user: StoredUser = { id, name, phone, password };
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    this.saveSession({ id, name, phone });
    return { ok: true };
  }

  async login(phone: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const user = this.getUsers().find(u => u.phone === phone && u.password === password);
    if (!user) {
      return { ok: false, error: 'Invalid phone number or password.' };
    }
    this.saveSession({ id: user.id, name: user.name, phone: user.phone });
    return { ok: true };
  }

  logout() {
    localStorage.removeItem(SESSION_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this._user() ? String(this._user()!.id) : null;
  }

  private getUsers(): StoredUser[] {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]'); }
    catch { return []; }
  }

  private saveSession(user: UserAccount) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private loadSession(): UserAccount | null {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (!s) return null;
      const p = JSON.parse(s);
      return p.id && p.name ? p : null;
    } catch { return null; }
  }
}
