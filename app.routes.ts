import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { GroupComponent } from './pages/group/group.component';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { UserComponent } from './pages/user/user.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
	{ path: 'dashboard', component: DashboardComponent },
	{ path: 'group', component: GroupComponent },
	{ path: 'user', component: UserComponent },
	{ path: 'landing', component: LandingComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'register', component: RegisterComponent }
];
