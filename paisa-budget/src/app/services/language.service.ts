import { Injectable, signal } from '@angular/core';
import { translations, Lang } from '../i18n/translations';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly KEY = 'paisa-lang';

  lang = signal<Lang>('en');

  constructor() {
    const stored = localStorage.getItem(this.KEY) as Lang;
    if (stored && ['en', 'hi', 'te'].includes(stored)) {
      this.lang.set(stored);
    }
  }

  setLang(lang: Lang) {
    this.lang.set(lang);
    localStorage.setItem(this.KEY, lang);
  }

  t(key: string): string {
    const parts = key.split('.');
    let obj: any = translations[this.lang()];
    for (const p of parts) obj = obj?.[p];
    return typeof obj === 'string' ? obj : key;
  }
}
