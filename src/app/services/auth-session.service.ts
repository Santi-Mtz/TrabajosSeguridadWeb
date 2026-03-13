import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

export type AuthSessionUser = {
  email: string;
  displayName: string;
};

@Injectable({
  providedIn: 'root'
})
export class AuthSessionService {
  private readonly authStorageKey = 'auth.currentUser';

  constructor(private readonly storage: StorageService) {}

  getCurrentUser(fallback: AuthSessionUser): AuthSessionUser {
    try {
      const parsed = this.storage.getJson<Partial<AuthSessionUser>>(this.authStorageKey);
      if (!parsed) {
        return fallback;
      }

      if (typeof parsed.email !== 'string' || typeof parsed.displayName !== 'string') {
        throw new TypeError('Formato inválido');
      }

      return {
        email: parsed.email.trim().toLowerCase(),
        displayName: parsed.displayName.trim()
      };
    } catch {
      return fallback;
    }
  }

  setCurrentUser(user: AuthSessionUser): void {
    this.storage.setJson(this.authStorageKey, {
      email: user.email.trim().toLowerCase(),
      displayName: user.displayName.trim()
    });
  }

  clearCurrentUser(): void {
    this.storage.removeItem(this.authStorageKey);
  }
}
