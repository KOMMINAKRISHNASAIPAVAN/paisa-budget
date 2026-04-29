import { Injectable, signal } from '@angular/core';

const KEY = 'notif_seen_count';

@Injectable({ providedIn: 'root' })
export class NotifStateService {
  private _seenCount = signal(parseInt(localStorage.getItem(KEY) ?? '0', 10));

  seenCount = this._seenCount.asReadonly();

  markSeen(count: number) {
    localStorage.setItem(KEY, String(count));
    this._seenCount.set(count);
  }
}
