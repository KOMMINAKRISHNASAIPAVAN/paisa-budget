import { Component, computed, inject, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Sidebar } from './layout/sidebar/sidebar';
import { AuthService } from './services/auth';
import { DataService } from './services/data.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);
  auth = inject(AuthService);
  private data = inject(DataService);

  private url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    )
  );

  showShell = computed(() => {
    const url = this.url() ?? '';
    return !url.startsWith('/login') && !url.startsWith('/register');
  });

  constructor() {
    // Load backend data whenever user logs in
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.data.loadAll();
      } else {
        this.data.clearAll();
      }
    });
  }
}
