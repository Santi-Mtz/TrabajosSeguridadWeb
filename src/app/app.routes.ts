import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { permissionGuard } from './permission.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
	{
		path: 'dashboard',
		canActivate: [authGuard],
		loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
	},
	{
		path: 'group',
		canActivate: [authGuard, permissionGuard],
		data: {
			anyPermissions: [
				'group:view',
				'group:add',
				'group:edit',
				'group:remove',
				'group:add:members',
				'group:remove:members',
				'ticket:view',
				'ticket:add',
				'ticket:edit',
				'ticket:edit:status',
				'ticket:edit:comment',
				'ticket:edit:priority',
				'ticket:edit:deadline',
				'ticket:edit:assign',
				'ticket:delete'
			]
		},
		loadComponent: () => import('./pages/group/group.component').then(m => m.GroupComponent)
	},
	{
		path: 'user',
		canActivate: [authGuard],
		loadComponent: () => import('./pages/user/user.component').then(m => m.UserComponent)
	},
	{ path: 'landing', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
	{ path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
	{ path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) }
];
