import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  auth = inject(AuthService);

  navItems = [
    { key: 'nav.dashboard', icon: '🏠', route: '/dashboard' },
    { key: 'nav.budgets',   icon: '💰', route: '/budgets' },
    { key: 'nav.expense',   icon: '💸', route: '/expense' },
    { key: 'nav.daily',     icon: '📓', route: '/daily' },
    { key: 'nav.profile',   icon: '👤', route: '/profile' },
  ];
}
