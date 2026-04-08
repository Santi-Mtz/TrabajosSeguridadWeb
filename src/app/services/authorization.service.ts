import { Injectable } from '@angular/core';
import { AuthSessionService } from './auth-session.service';
import { StorageService } from './storage.service';

export type AppPermission =
  | 'ticket:add'
  | 'ticket:view'
  | 'ticket:edit'
  | 'ticket:edit:status'
  | 'ticket:edit:comment'
  | 'ticket:edit:priority'
  | 'ticket:edit:deadline'
  | 'ticket:edit:assign'
  | 'ticket:delete'
  | 'group:add'
  | 'group:view'
  | 'group:edit'
  | 'group:remove'
  | 'group:add:members'
  | 'group:remove:members'
  | 'user:add'
  | 'user:view:all'
  | 'user:edit'
  | 'user:remove'
  | 'user:edit:permissions'
  | 'user:deactivate'
  | 'user:activate';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {
  private readonly permissionsStorageKey = 'crud.user.permissions';
  private readonly superAdminEmail = 'superadmin@seguridadweb.com';

  readonly allPermissions: AppPermission[] = [
    'ticket:add',
    'ticket:view',
    'ticket:edit',
    'ticket:edit:status',
    'ticket:edit:comment',
    'ticket:edit:priority',
    'ticket:edit:deadline',
    'ticket:edit:assign',
    'ticket:delete',
    'group:add',
    'group:view',
    'group:edit',
    'group:remove',
    'group:add:members',
    'group:remove:members',
    'user:add',
    'user:view:all',
    'user:edit',
    'user:remove',
    'user:edit:permissions',
    'user:deactivate',
    'user:activate'
  ];

  private readonly defaultPermissionsByUser: Record<string, AppPermission[]> = {
    [this.superAdminEmail]: [...this.allPermissions],
    'admin@seguridadweb.com': [
      'ticket:add',
      'ticket:view',
      'ticket:edit',
      'ticket:edit:status',
      'ticket:edit:comment',
      'ticket:edit:priority',
      'ticket:edit:deadline',
      'ticket:edit:assign',
      'group:add',
      'group:view',
      'group:edit',
      'group:add:members',
      'group:remove:members',
      'user:view:all',
      'user:add',
      'user:edit',
      'user:edit:permissions',
      'user:activate',
      'user:deactivate'
    ],
    'santiago.martinez@example.com': [
      'ticket:add',
      'ticket:view',
      'ticket:edit:status',
      'ticket:edit:comment'
    ]
  };

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly storage: StorageService
  ) {}

  getCurrentPermissions(): AppPermission[] {
    const currentUser = this.authSession.getCurrentUserOrNull();
    if (!currentUser) {
      return [];
    }

    return this.getPermissionsForEmail(currentUser.email);
  }

  has(permission: AppPermission): boolean {
    return this.getCurrentPermissions().includes(permission);
  }

  hasAny(permissions: AppPermission[]): boolean {
    if (permissions.length === 0) {
      return true;
    }

    const current = this.getCurrentPermissions();
    return permissions.some((permission) => current.includes(permission));
  }

  canAccessGroupSection(): boolean {
    return this.hasAny([
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
    ]);
  }

  canAccessUserAdminSection(): boolean {
    return this.hasAny([
      'user:view:all',
      'user:add',
      'user:edit',
      'user:remove',
      'user:edit:permissions',
      'user:activate',
      'user:deactivate'
    ]);
  }

  canCreateTickets(): boolean {
    return this.has('ticket:add');
  }

  canEditTickets(): boolean {
    return this.hasAny([
      'ticket:edit',
      'ticket:edit:status',
      'ticket:edit:comment',
      'ticket:edit:priority',
      'ticket:edit:deadline',
      'ticket:edit:assign'
    ]);
  }

  canDeleteTickets(): boolean {
    return this.has('ticket:delete');
  }

  getPermissionsForEmail(email: string): AppPermission[] {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return [];
    }

    if (normalizedEmail === this.superAdminEmail) {
      return [...this.allPermissions];
    }

    const permissionsMap = this.loadPermissionsMap();
    return permissionsMap[normalizedEmail] ?? [];
  }

  private loadPermissionsMap(): Record<string, AppPermission[]> {
    const allowedPermissions = new Set(this.allPermissions);

    try {
      const parsed = this.storage.getJson<Record<string, unknown>>(this.permissionsStorageKey);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ...this.defaultPermissionsByUser };
      }

      const normalized = Object.fromEntries(
        Object.entries(parsed).map(([email, permissions]) => {
          if (!Array.isArray(permissions)) {
            return [email.trim().toLowerCase(), []];
          }

          const filtered = permissions
            .flatMap((permission) => {
              if (typeof permission !== 'string') {
                return [];
              }

              return this.migrateLegacyPermission(permission);
            })
            .filter((permission): permission is AppPermission => allowedPermissions.has(permission));

          return [email.trim().toLowerCase(), [...new Set(filtered)]];
        })
      ) as Record<string, AppPermission[]>;

      return {
        ...this.defaultPermissionsByUser,
        ...normalized,
        [this.superAdminEmail]: [...this.allPermissions]
      };
    } catch {
      return { ...this.defaultPermissionsByUser };
    }
  }

  private migrateLegacyPermission(permission: string): AppPermission[] {
    const direct = permission as AppPermission;
    if (this.allPermissions.includes(direct)) {
      return [direct];
    }

    const legacyMap: Record<string, AppPermission[]> = {
      'ticket:create': ['ticket:add'],
      'ticket:edit': [
        'ticket:edit',
        'ticket:edit:status',
        'ticket:edit:comment',
        'ticket:edit:priority',
        'ticket:edit:deadline',
        'ticket:edit:assign'
      ],
      'group:delete': ['group:remove'],
      'user:create': ['user:add'],
      'user:delete': ['user:remove'],
      'user:permissions': ['user:edit:permissions']
    };

    return legacyMap[permission] ?? [];
  }
}
