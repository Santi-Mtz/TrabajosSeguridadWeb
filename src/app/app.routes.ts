import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
	{ path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
	{ path: 'group', loadComponent: () => import('./pages/group/group.component').then(m => m.GroupComponent) },
	{ path: 'user', loadComponent: () => import('./pages/user/user.component').then(m => m.UserComponent) },
	{ path: 'landing', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
	{ path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
	{ path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) }
];
