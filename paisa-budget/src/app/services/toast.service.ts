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
    this.playSound(type);
  }

  private playSound(type: Toast['type']) {
    try {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      const play = (freq: number, start: number, end: number, vol = 0.25) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        osc.connect(gain);
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + end);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + end);
      };

      if (type === 'success') {
        // Pleasant two-note ding: C5 → E5
        play(523, 0,    0.18);
        play(659, 0.12, 0.35);
      } else if (type === 'warning') {
        // Urgent double beep: D4 → D4
        play(370, 0,    0.15, 0.35);
        play(370, 0.18, 0.33, 0.35);
      } else {
        // Soft single ping: A4
        play(440, 0, 0.25, 0.18);
      }
    } catch { /* AudioContext blocked (e.g. before user gesture) — silent */ }
  }

  dismiss(id: number) {
    this._toasts.update(t => t.filter(x => x.id !== id));
  }
}
