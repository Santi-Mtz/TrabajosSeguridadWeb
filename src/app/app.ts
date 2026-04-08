import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { AuthSessionService } from './services/auth-session.service';
import { AuthorizationService } from './services/authorization.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, DrawerModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(
    public router: Router,
    private readonly authSession: AuthSessionService,
    private readonly authorization: AuthorizationService
  ) {}

  projectName = 'Practica 2';
  appVersion = '1.6';
  menuOpen = true;
  mobileMenuOpen = false;

  get showSidebar(): boolean {
    const hiddenRoutes = ['/landing', '/login', '/register'];
    return !hiddenRoutes.some((route) => this.router.url.startsWith(route));
  }

  get canOpenGroup(): boolean {
    return this.authorization.canAccessGroupSection();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  navigateTo(path: '/dashboard' | '/group' | '/user'): void {
    if (path === '/group' && !this.canOpenGroup) {
      this.mobileMenuOpen = false;
      void this.router.navigate(['/dashboard']);
      return;
    }

    this.mobileMenuOpen = false;
    void this.router.navigate([path]);
  }

  isActive(path: '/dashboard' | '/group' | '/user'): boolean {
    return this.router.url.startsWith(path);
  }

  logout(): void {
    this.authSession.clearCurrentUser();
    this.mobileMenuOpen = false;
    void this.router.navigate(['/login']);
  }
}
