import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DataService } from '../../services/data.service';
import { NotifStateService } from '../../services/notif-state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  auth        = inject(AuthService);
  private data        = inject(DataService);
  private notifState  = inject(NotifStateService);

  navItems = [
    { key: 'nav.dashboard', icon: '🏠', route: '/dashboard' },
    { key: 'nav.budgets',   icon: '💰', route: '/budgets' },
    { key: 'nav.expense',   icon: '💸', route: '/expense' },
    { key: 'nav.daily',     icon: '📓', route: '/daily' },
    { key: 'nav.profile',   icon: '👤', route: '/profile' },
  ];

  alertCount = computed(() => {
    const overBudget = this.data.budgets().filter(b => b.active && b.spent > b.limit).length;
    const income     = this.auth.currentUser()?.monthlyIncome ?? 0;
    const overIncome = income > 0 && this.data.thisMonthTotal() > income ? 1 : 0;
    return overBudget + overIncome;
  });

  // Show badge when there are alerts AND user hasn't seen them yet
  showBadge = computed(() => this.alertCount() > 0 && this.notifState.hasUnread());
}
