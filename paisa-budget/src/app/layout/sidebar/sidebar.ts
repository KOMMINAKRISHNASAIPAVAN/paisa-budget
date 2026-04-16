import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  auth = inject(AuthService);

  navItems = [
    { label: 'Dashboard',    icon: '🏠', route: '/dashboard' },
    { label: 'Budgets',      icon: '💰', route: '/budgets' },
    { label: 'Expense',      icon: '💸', route: '/expense' },
    { label: 'Daily Tracker',icon: '📓', route: '/daily' },
    { label: 'Transactions', icon: '🔄', route: '/transactions' },
    { label: 'Insights',     icon: '📊', route: '/insights' },
    { label: 'Profile',      icon: '👤', route: '/profile' },
  ];
}
