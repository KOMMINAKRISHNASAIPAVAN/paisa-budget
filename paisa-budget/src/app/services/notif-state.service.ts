import { Injectable, signal } from '@angular/core';

const KEY = 'notif_has_unread';

@Injectable({ providedIn: 'root' })
export class NotifStateService {
  private _hasUnread = signal(localStorage.getItem(KEY) === 'true');

  hasUnread = this._hasUnread.asReadonly();

  markUnread() {
    localStorage.setItem(KEY, 'true');
    this._hasUnread.set(true);
  }

  markSeen() {
    localStorage.setItem(KEY, 'false');
    this._hasUnread.set(false);
  }
}
