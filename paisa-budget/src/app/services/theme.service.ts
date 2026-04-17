import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'paisa-theme';

  isDark = signal<boolean>(true);

  constructor() {
    const stored = localStorage.getItem(this.KEY);
    const dark = stored ? stored === 'dark' : true; // default: dark
    this.isDark.set(dark);
    this._apply(dark);
  }

  setDark(dark: boolean) {
    this.isDark.set(dark);
    localStorage.setItem(this.KEY, dark ? 'dark' : 'light');
    this._apply(dark);
  }

  private _apply(dark: boolean) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
}
