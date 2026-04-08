import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from './services/auth-session.service';
import { AccountAccessService } from './services/account-access.service';

export const authGuard: CanActivateFn = () => {
  const authSession = inject(AuthSessionService);
  const accountAccess = inject(AccountAccessService);
  const router = inject(Router);

  const currentUser = authSession.getCurrentUserOrNull();
  if (!currentUser) {
    return router.parseUrl('/login');
  }

  if (!accountAccess.isUserActive(currentUser.email)) {
    authSession.clearCurrentUser();
    return router.parseUrl('/login');
  }

  if (authSession.hasCurrentUser()) {
    return true;
  }

  return router.parseUrl('/login');
};
