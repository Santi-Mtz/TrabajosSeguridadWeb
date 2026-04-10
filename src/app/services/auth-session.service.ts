import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

export type AuthSessionUser = {
  id?: number;
  email: string;
  displayName: string;
};

@Injectable({
  providedIn: 'root'
})
export class AuthSessionService {
  private readonly authStorageKey = 'auth.currentUser';

  constructor(private readonly storage: StorageService) {}

  getCurrentUserOrNull(): AuthSessionUser | null {
    try {
      const parsed = this.storage.getJson<Partial<AuthSessionUser>>(this.authStorageKey);
      if (!parsed) {
        return null;
      }

      if (typeof parsed.email !== 'string' || typeof parsed.displayName !== 'string') {
        throw new TypeError('Formato invalido');
      }

      if (parsed.id !== undefined && typeof parsed.id !== 'number') {
        throw new TypeError('Formato invalido');
      }

      const email = parsed.email.trim().toLowerCase();
      const displayName = parsed.displayName.trim();

      if (!email || !displayName) {
        return null;
      }

      return { id: parsed.id, email, displayName };
    } catch {
      return null;
    }
  }

  hasCurrentUser(): boolean {
    return this.getCurrentUserOrNull() !== null;
  }

  getCurrentUser(fallback: AuthSessionUser): AuthSessionUser {
    return this.getCurrentUserOrNull() ?? fallback;
  }

  setCurrentUser(user: AuthSessionUser): void {
    this.storage.setJson(this.authStorageKey, {
      id: typeof user.id === 'number' ? user.id : undefined,
      email: user.email.trim().toLowerCase(),
      displayName: user.displayName.trim()
    });
  }

  clearCurrentUser(): void {
    this.storage.removeItem(this.authStorageKey);
  }
}
