import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(public router: Router) {}

  projectName = 'Practica 2';
  appVersion = '4.0';
  menuOpen = true;

  get showSidebar(): boolean {
    const hiddenRoutes = ['/landing', '/login', '/register'];
    return !hiddenRoutes.some((route) => this.router.url.startsWith(route));
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  navigateTo(path: '/dashboard' | '/group' | '/user'): void {
    void this.router.navigate([path]);
  }
}
