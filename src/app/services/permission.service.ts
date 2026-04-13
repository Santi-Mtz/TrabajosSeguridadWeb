import { Injectable } from '@angular/core';
import { AuthSessionService } from './auth-session.service';
import { AuthorizationService, AppPermission } from './authorization.service';
import { StorageService } from './storage.service';

type GroupScopedPermissionMap = Record<string, Record<string, string[]>>;

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly groupPermissionsStorageKey = 'crud.user.permissions.byGroup';
  private selectedGroupId: string | null = null;

  constructor(
    private readonly authorization: AuthorizationService,
    private readonly authSession: AuthSessionService,
    private readonly storage: StorageService
  ) {}

  hasPermission(permission: string): boolean {
    const normalized = permission.trim();
    if (!normalized) {
      return false;
    }

    const aliases = this.permissionAliases(normalized);

    // If there is a group-scoped assignment for the current user/group, prefer it.
    const groupScoped = this.getGroupScopedPermissionsForCurrentUser();
    if (groupScoped !== null) {
      return aliases.some((item) => groupScoped.includes(item));
    }

    return aliases.some((item) => this.matchesAuthorizationPermission(item));
  }

  refreshPermissionsForGroup(groupId: string): void {
    const normalized = groupId.trim();
    this.selectedGroupId = normalized.length > 0 ? normalized : null;
  }

  private getGroupScopedPermissionsForCurrentUser(): string[] | null {
    if (!this.selectedGroupId) {
      return null;
    }

    const currentUser = this.authSession.getCurrentUserOrNull();
    if (!currentUser) {
      return null;
    }

    const all = this.storage.getJson<GroupScopedPermissionMap>(this.groupPermissionsStorageKey);
    if (!all || typeof all !== 'object') {
      return null;
    }

    const email = currentUser.email.trim().toLowerCase();
    const userMap = all[email];
    if (!userMap || typeof userMap !== 'object') {
      return null;
    }

    const groupPerms = userMap[this.selectedGroupId];
    if (!Array.isArray(groupPerms)) {
      return null;
    }

    return groupPerms
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private matchesAuthorizationPermission(permission: string): boolean {
    if (permission === 'groups:manage') {
      return this.authorization.hasAny(['group:add', 'group:edit', 'group:remove']);
    }

    if (permission === 'users:manage') {
      return this.authorization.hasAny(['user:add', 'user:edit', 'user:remove', 'user:edit:permissions']);
    }

    return this.authorization.has(permission as AppPermission);
  }

  private permissionAliases(permission: string): string[] {
    const map: Record<string, string[]> = {
      'tickets:add': ['tickets:add', 'ticket:add'],
      'tickets:move': ['tickets:move', 'ticket:edit:status'],
      'groups:manage': ['groups:manage', 'group:add', 'group:edit', 'group:remove'],
      'users:manage': ['users:manage', 'user:add', 'user:edit', 'user:remove', 'user:edit:permissions']
    };

    return map[permission] ?? [permission];
  }
}
