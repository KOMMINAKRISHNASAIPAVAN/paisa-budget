import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  icon: string;
  type: 'success' | 'info' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();
  private nextId = 0;

  show(message: string, icon = '✅', type: Toast['type'] = 'success', duration = 3500) {
    const id = this.nextId++;
    this._toasts.update(t => [...t, { id, message, icon, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number) {
    this._toasts.update(t => t.filter(x => x.id !== id));
  }
}
