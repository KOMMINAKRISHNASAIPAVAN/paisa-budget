import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register),
    canActivate: [guestGuard]
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword),
    canActivate: [guestGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard]
  },
  {
    path: 'budgets',
    loadComponent: () => import('./pages/budgets/budgets').then(m => m.Budgets),
    canActivate: [authGuard]
  },
  {
    path: 'expense',
    loadComponent: () => import('./pages/expense/expense').then(m => m.Expense),
    canActivate: [authGuard]
  },
  {
    path: 'transactions',
    loadComponent: () => import('./pages/transactions/transactions').then(m => m.Transactions),
    canActivate: [authGuard]
  },
  {
    path: 'insights',
    loadComponent: () => import('./pages/insights/insights').then(m => m.Insights),
    canActivate: [authGuard]
  },
  {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications/notifications').then(m => m.Notifications),
    canActivate: [authGuard]
  },
  {
    path: 'daily',
    loadComponent: () => import('./pages/daily/daily').then(m => m.Daily),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
    canActivate: [authGuard]
  },
];
