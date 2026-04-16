import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';
import { Login }        from './pages/login/login';
import { Register }     from './pages/register/register';
import { Dashboard }    from './pages/dashboard/dashboard';
import { Budgets }      from './pages/budgets/budgets';
import { Expense }      from './pages/expense/expense';
import { Transactions } from './pages/transactions/transactions';
import { Insights }     from './pages/insights/insights';
import { Profile }      from './pages/profile/profile';
import { Daily }        from './pages/daily/daily';

export const routes: Routes = [
  { path: '',           redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',      component: Login,        canActivate: [guestGuard] },
  { path: 'register',   component: Register,     canActivate: [guestGuard] },
  { path: 'dashboard',  component: Dashboard,    canActivate: [authGuard] },
  { path: 'budgets',    component: Budgets,      canActivate: [authGuard] },
  { path: 'expense',    component: Expense,      canActivate: [authGuard] },
  { path: 'transactions', component: Transactions, canActivate: [authGuard] },
  { path: 'insights',   component: Insights,     canActivate: [authGuard] },
  { path: 'daily',      component: Daily,        canActivate: [authGuard] },
  { path: 'profile',    component: Profile,      canActivate: [authGuard] },
];
