import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from './services/auth-session.service';
import { AccountAccessService } from './services/account-access.service';
import { AppPermission, AuthorizationService } from './services/authorization.service';

function getRequiredPermissions(route: ActivatedRouteSnapshot): AppPermission[] {
  const value = route.data['anyPermissions'];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AppPermission => typeof item === 'string');
}

export const permissionGuard: CanActivateFn = (route) => {
  const authSession = inject(AuthSessionService);
  const accountAccess = inject(AccountAccessService);
  const authorization = inject(AuthorizationService);
  const router = inject(Router);

  const currentUser = authSession.getCurrentUserOrNull();
  if (!currentUser) {
    return router.parseUrl('/login');
  }

  if (!accountAccess.isUserActive(currentUser.email)) {
    authSession.clearCurrentUser();
    return router.parseUrl('/login');
  }

  const requiredPermissions = getRequiredPermissions(route);
  if (requiredPermissions.length === 0 || authorization.hasAny(requiredPermissions)) {
    return true;
  }

  return router.parseUrl('/dashboard');
};
