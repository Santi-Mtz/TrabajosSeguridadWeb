import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

type StoredUser = {
  email?: string;
  isActive?: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class AccountAccessService {
  private readonly usersStorageKey = 'crud.users';

  constructor(private readonly storage: StorageService) {}

  isUserActive(email: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return false;
    }

    try {
      const users = this.storage.getJson<StoredUser[]>(this.usersStorageKey);
      if (!users || !Array.isArray(users)) {
        return true;
      }

      const matched = users.find((user) =>
        typeof user?.email === 'string' && user.email.trim().toLowerCase() === normalizedEmail
      );

      if (!matched) {
        return true;
      }

      if (typeof matched.isActive !== 'boolean') {
        return true;
      }

      return matched.isActive;
    } catch {
      return true;
    }
  }
}
