import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AuthSessionService, AuthSessionUser } from '../../services/auth-session.service';
import { AppPermission } from '../../services/authorization.service';
import { StorageService } from '../../services/storage.service';
import { ValidationService } from '../../services/validation.service';
import { WorkboardApiService } from '../../services/workboard-api.service';
import { UserFormComponent } from '../../components/user-form/user-form.component';

type UserRecord = {
  id: number;
  username: string;
  fullName: string;
  address: string;
  phone: string;
  birthDate: string;
  email: string;
  role: string;
  team: string;
  isActive: boolean;
};

type UserFormModel = {
  id: number;
  username: string;
  fullName: string;
  address: string;
  phone: string;
  birthDate: string | Date | null;
  email: string;
  role: string;
  team: string;
};

type UserPermission = AppPermission;

type TicketStatus = 'Pendiente' | 'En progreso' | 'Revisión' | 'Bloqueado' | 'Hecho';
type TicketPriority = 'Muy baja' | 'Baja' | 'Media-baja' | 'Media' | 'Media-alta' | 'Alta' | 'Urgente';

type TicketRecord = {
  id: number;
  groupId: number;
  title: string;
  description: string;
  createdBy: string;
  status: TicketStatus;
  assignedTo: string;
  priority: TicketPriority;
  createdAt: string;
  dueDate: string;
  comments: string[];
  history: string[];
};

type GroupOption = {
  id: number;
  name: string;
};

type GroupScopedPermissionMap = Record<string, Record<string, UserPermission[]>>;

@Component({
  selector: 'app-user',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    MessageModule,
    TableModule,
    TagModule,
    SelectModule,
    UserFormComponent
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly authSession: AuthSessionService,
    private readonly storage: StorageService,
    private readonly validation: ValidationService,
    private readonly workboardApi: WorkboardApiService
  ) {}
  private readonly superAdminEmail = 'superadmin@seguridadweb.com';
  private readonly securityAdminEmail = 'admin@seguridadweb.com';
  private readonly groupPermissionStorageKey = 'crud.user.permissions.byGroup';

  readonly allPermissions: UserPermission[] = [
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

  private readonly defaultUsers: UserRecord[] = [
    {
      id: 1,
      username: 'superAdmin',
      fullName: 'superAdmin',
      address: 'Centro de Control de Seguridad',
      phone: '5599001122',
      birthDate: '1995-01-01',
      email: this.superAdminEmail,
      role: 'superAdmin',
      team: 'Seguridad web',
      isActive: true
    },
    {
      id: 2,
      username: 'smartinez',
      fullName: 'Santiago Martinez',
      address: 'Av. Universidad 120, Ciudad de México',
      phone: '5512345678',
      birthDate: '2000-02-14',
      email: 'santiago.martinez@example.com',
      role: 'Estudiante',
      team: 'Seguridad web',
      isActive: true
    },
    {
      id: 3,
      username: 'admin',
      fullName: 'Administrador',
      address: 'Laboratorio de Seguridad, Campus Central',
      phone: '5587654321',
      birthDate: '1998-06-10',
      email: 'admin@seguridadweb.com',
      role: 'Administrador',
      team: 'Seguridad web',
      isActive: true
    }
  ];

  private readonly defaultPermissionsByUser: Record<string, UserPermission[]> = {
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
    'santiago.martinez@example.com': ['ticket:add', 'ticket:view', 'ticket:edit:status', 'ticket:edit:comment']
  };

  notification: { severity: 'success' | 'error'; text: string } | null = null;
  currentUser: AuthSessionUser = {
    email: this.superAdminEmail,
    displayName: 'superAdmin'
  };

  users: UserRecord[] = [...this.defaultUsers];
  tickets: TicketRecord[] = [];
  permissionsByUser: Record<string, UserPermission[]> = { ...this.defaultPermissionsByUser };
  permissionGroups: GroupOption[] = [];
  selectedPermissionGroupId: number | null = null;
  permissionsByUserAndGroup: GroupScopedPermissionMap = {};

  profileForm: UserFormModel = this.createEmptyForm();
  userCrudForm: UserFormModel = this.createEmptyForm();

  editingUserId: number | null = null;
  selectedPermissionUserId: number | null = null;
  requestedSection: 'profile' | 'admin' = 'profile';
  sourceGroupId: number | null = null;

  ngOnInit(): void {
    this.loadCurrentUser();
    this.syncContextFromRoute();
    void this.loadFromApi();
  }

  private async loadFromApi(): Promise<void> {
    await Promise.all([
      this.loadUsers(),
      this.loadTickets(),
      this.loadPermissionGroups()
    ]);
    await this.loadPermissions();
    this.loadGroupScopedPermissions();
    this.ensureCurrentProfile();
    this.resetUserCrudForm();
    this.selectedPermissionUserId = this.users[0]?.id ?? null;
    if (this.sourceGroupId !== null && this.permissionGroups.some((group) => group.id === this.sourceGroupId)) {
      this.selectedPermissionGroupId = this.sourceGroupId;
    } else {
      this.selectedPermissionGroupId = this.permissionGroups[0]?.id ?? null;
    }
    this.cdr.markForCheck();
  }

  get currentProfile(): UserFormModel {
    return this.profileForm;
  }

  get isSuperAdmin(): boolean {
    const byIdentity = this.currentUser.email.trim().toLowerCase() === this.superAdminEmail;
    const byUsername = this.profileForm.username.trim() === 'superAdmin';
    return byIdentity || byUsername;
  }

  private isProtectedAdminAccount(email: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    return normalizedEmail === this.superAdminEmail || normalizedEmail === this.securityAdminEmail;
  }

  private isProtectedAdminUser(user: UserRecord): boolean {
    return (
      user.username === 'superAdmin'
      || user.email.toLowerCase() === this.superAdminEmail
      || user.email.toLowerCase() === this.securityAdminEmail
    );
  }

  get currentUserPermissions(): UserPermission[] {
    return this.getPermissionsForEmail(this.currentUser.email);
  }

  get hasUserCrudPermissions(): boolean {
    return this.hasCurrentPermission('user:add') &&
      this.hasCurrentPermission('user:edit') &&
      this.hasCurrentPermission('user:remove');
  }

  get canManagePermissions(): boolean {
    return this.hasCurrentPermission('user:edit:permissions');
  }

  get canCreateUsers(): boolean {
    return this.hasCurrentPermission('user:add');
  }

  get canEditUsers(): boolean {
    return this.hasCurrentPermission('user:edit');
  }

  get canDeleteUsers(): boolean {
    return this.hasCurrentPermission('user:remove');
  }

  get canViewAllUsers(): boolean {
    return this.hasCurrentPermission('user:view:all');
  }

  get canActivateUsers(): boolean {
    return this.hasCurrentPermission('user:activate');
  }

  get canDeactivateUsers(): boolean {
    return this.hasCurrentPermission('user:deactivate');
  }

  get canManageUsers(): boolean {
    return this.canViewAllUsers ||
      this.canCreateUsers ||
      this.canEditUsers ||
      this.canDeleteUsers ||
      this.canManagePermissions ||
      this.canActivateUsers ||
      this.canDeactivateUsers;
  }

  get showAdminSection(): boolean {
    if (this.requestedSection === 'admin') {
      return this.canManageUsers;
    }

    return this.canManageUsers;
  }

  get userOptions(): Array<{ label: string; value: number }> {
    return this.users.map((user) => ({
      label: `${user.username} (${user.email})`,
      value: user.id
    }));
  }

  get selectedPermissionUser(): UserRecord | null {
    return this.users.find((user) => user.id === this.selectedPermissionUserId) ?? null;
  }

  get selectedPermissionUserPermissions(): UserPermission[] {
    const user = this.selectedPermissionUser;
    if (!user) {
      return [];
    }

    return this.getPermissionsForEmail(user.email);
  }

  get permissionGroupOptions(): Array<{ label: string; value: number }> {
    return this.permissionGroups.map((group) => ({ label: group.name, value: group.id }));
  }

  get selectedPermissionGroupName(): string {
    if (this.selectedPermissionGroupId === null) {
      return 'Sin grupo';
    }

    return this.permissionGroups.find((group) => group.id === this.selectedPermissionGroupId)?.name ?? `Grupo ${this.selectedPermissionGroupId}`;
  }

  get selectedPermissionGroupPermissions(): UserPermission[] {
    const user = this.selectedPermissionUser;
    const groupId = this.selectedPermissionGroupId;
    if (!user || groupId === null) {
      return [];
    }

    const email = user.email.toLowerCase();
    const groupMap = this.permissionsByUserAndGroup[email] ?? {};
    const groupPermissions = groupMap[String(groupId)];

    return Array.isArray(groupPermissions) ? groupPermissions : [];
  }

  get assignedTickets(): TicketRecord[] {
    const identity = this.currentUser.email.trim().toLowerCase();
    const displayName = this.currentUser.displayName.trim().toLowerCase();
    const idTag = this.currentUser.id ? `usuario #${this.currentUser.id}` : '';

    return this.tickets
      .filter((ticket) => {
        const assigned = ticket.assignedTo.trim().toLowerCase();
        return assigned === identity || assigned === displayName || (idTag.length > 0 && assigned === idTag);
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  get openTicketsCount(): number {
    return this.assignedTickets.filter((ticket) => ticket.status === 'Pendiente').length;
  }

  get inProgressTicketsCount(): number {
    return this.assignedTickets.filter((ticket) => ticket.status === 'En progreso').length;
  }

  get doneTicketsCount(): number {
    return this.assignedTickets.filter((ticket) => ticket.status === 'Hecho').length;
  }

  get blockedTicketsCount(): number {
    return this.assignedTickets.filter((ticket) => ticket.status === 'Bloqueado').length;
  }

  get isProfileValid(): boolean {
    return (
      this.profileForm.username.trim().length > 0 &&
      this.profileForm.fullName.trim().length > 0 &&
      this.profileForm.address.trim().length > 0 &&
      this.validation.isValidPhone(this.profileForm.phone) &&
      this.profileBirthDateIso.length > 0 &&
      this.validation.isValidEmail(this.profileForm.email) &&
      this.profileForm.role.trim().length > 0 &&
      this.profileForm.team.trim().length > 0
    );
  }

  get isCrudFormValid(): boolean {
    return (
      this.userCrudForm.username.trim().length > 0 &&
      this.userCrudForm.fullName.trim().length > 0 &&
      this.userCrudForm.address.trim().length > 0 &&
      this.validation.isValidPhone(this.userCrudForm.phone) &&
      this.crudBirthDateIso.length > 0 &&
      this.validation.isValidEmail(this.userCrudForm.email) &&
      this.userCrudForm.role.trim().length > 0 &&
      this.userCrudForm.team.trim().length > 0
    );
  }

  get profileBirthDateIso(): string {
    return this.normalizeBirthDate(this.profileForm.birthDate);
  }

  get crudBirthDateIso(): string {
    return this.normalizeBirthDate(this.userCrudForm.birthDate);
  }

  async saveProfile(): Promise<void> {
    this.notification = null;

    if (!this.isProfileValid) {
      this.pushNotification('error', 'Validación', this.getUserFormValidationMessage(this.profileForm, this.profileBirthDateIso, 'perfil'));
      return;
    }

    const normalized: UserRecord = {
      ...this.profileForm,
      username: this.profileForm.username.trim(),
      fullName: this.profileForm.fullName.trim(),
      address: this.profileForm.address.trim(),
      phone: this.profileForm.phone.trim(),
      birthDate: this.profileBirthDateIso,
      email: this.profileForm.email.trim().toLowerCase(),
      role: this.profileForm.role.trim(),
      team: this.profileForm.team.trim(),
      isActive: this.users.find((user) => user.id === this.profileForm.id)?.isActive ?? true
    };

    try {
      const saved = normalized.id > 0
        ? await this.workboardApi.updateUser(normalized.id, this.toApiUserPayload(normalized))
        : await this.workboardApi.createUser({
          ...this.toApiUserPayload(normalized),
          is_active: true
        });

      const savedUser = this.mapApiUserToView(saved);
      this.profileForm.id = savedUser.id;

      this.authSession.setCurrentUser({
        id: savedUser.id,
        email: savedUser.email,
        displayName: savedUser.fullName
      });

      this.currentUser = {
        id: savedUser.id,
        email: savedUser.email,
        displayName: savedUser.fullName
      };

      await this.refreshUsersAndPermissions();
    } catch (error) {
      this.pushNotification('error', 'Operación fallida', error instanceof Error ? error.message : 'No fue posible guardar el perfil.');
      return;
    }

    this.pushNotification('success', 'Operación completada', 'El perfil se actualizó correctamente.');
  }

  resetProfile(): void {
    this.ensureCurrentProfile();
  }

  async saveUserCrud(): Promise<void> {
    this.notification = null;

    if (!this.canManageUsers) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con permisos suficientes para administrar usuarios.');
      return;
    }

    if (!this.isCrudFormValid) {
      this.pushNotification('error', 'Validacion', this.getUserFormValidationMessage(this.userCrudForm, this.crudBirthDateIso, 'usuario'));
      return;
    }

    const normalized = this.buildNormalizedCrudUser();
    if (this.hasDuplicateUserEmail(normalized)) {
      this.pushNotification('error', 'Validacion', 'Ya existe un usuario registrado con ese correo electronico.');
      return;
    }

    if (this.editingUserId === null) {
      const created = await this.createCrudUser(normalized);
      if (!created) {
        return;
      }
    } else {
      const updated = await this.updateCrudUser(normalized);
      if (!updated) {
        return;
      }
    }

    await this.refreshUsersAndPermissions();

    this.resetUserCrudForm();
  }

  private buildNormalizedCrudUser(): UserRecord {
    return {
      id: this.userCrudForm.id,
      username: this.userCrudForm.username.trim(),
      fullName: this.userCrudForm.fullName.trim(),
      address: this.userCrudForm.address.trim(),
      phone: this.userCrudForm.phone.trim(),
      birthDate: this.crudBirthDateIso,
      email: this.userCrudForm.email.trim().toLowerCase(),
      role: this.userCrudForm.role.trim(),
      team: this.userCrudForm.team.trim(),
      isActive: true
    };
  }

  private hasDuplicateUserEmail(user: UserRecord): boolean {
    return this.users.some((item) => item.id !== user.id && item.email.toLowerCase() === user.email);
  }

  private async createCrudUser(normalized: UserRecord): Promise<boolean> {
    if (!this.canCreateUsers) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para crear usuarios.');
      return false;
    }

    try {
      await this.workboardApi.createUser({
        ...this.toApiUserPayload(normalized),
        is_active: true
      });
      this.pushNotification('success', 'Operación completada', 'El usuario se creó correctamente.');
      return true;
    } catch (error) {
      this.pushNotification('error', 'Operación fallida', error instanceof Error ? error.message : 'No fue posible crear el usuario.');
      return false;
    }
  }

  private async updateCrudUser(normalized: UserRecord): Promise<boolean> {
    if (!this.canEditUsers) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para editar usuarios.');
      return false;
    }

    try {
      await this.workboardApi.updateUser(this.editingUserId as number, this.toApiUserPayload(normalized));

      this.pushNotification('success', 'Operación completada', 'La información del usuario se actualizó correctamente.');
      return true;
    } catch (error) {
      this.pushNotification('error', 'Operación fallida', error instanceof Error ? error.message : 'No fue posible actualizar el usuario.');
      return false;
    }
  }

  editUserRecord(user: UserRecord): void {
    if (!this.canManageUsers) {
      return;
    }

    this.editingUserId = user.id;
    this.userCrudForm = {
      ...user,
      birthDate: user.birthDate
    };
  }

  async deleteUserRecord(user: UserRecord): Promise<void> {
    this.notification = null;

    if (!this.canDeleteUsers) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para eliminar usuarios.');
      return;
    }

    if (this.isProtectedAdminUser(user)) {
      this.pushNotification('error', 'Operación no permitida', 'No es posible eliminar cuentas de administración protegidas.');
      return;
    }

    if (user.email.toLowerCase() === this.currentUser.email.toLowerCase()) {
      this.pushNotification('error', 'Operación no permitida', 'No es posible eliminar la cuenta con la que tienes la sesión activa.');
      return;
    }

    try {
      await this.workboardApi.deleteUser(user.id);
      await this.refreshUsersAndPermissions();
    } catch (error) {
      this.pushNotification('error', 'Operación fallida', error instanceof Error ? error.message : 'No fue posible eliminar el usuario.');
      return;
    }

    this.resetUserCrudForm();
    this.pushNotification('success', 'Operación completada', 'El usuario se eliminó correctamente.');
  }

  async toggleUserActive(user: UserRecord): Promise<void> {
    this.notification = null;

    if (this.isProtectedAdminUser(user)) {
      this.pushNotification('error', 'Operación no permitida', 'Las cuentas de administración protegidas deben permanecer activas.');
      return;
    }

    const isCurrentSessionUser = user.email.toLowerCase() === this.currentUser.email.toLowerCase();
    if (isCurrentSessionUser && user.isActive) {
      this.pushNotification('error', 'Operación no permitida', 'No es posible desactivar la cuenta con sesión activa.');
      return;
    }

    if (user.isActive && !this.canDeactivateUsers) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para desactivar usuarios.');
      return;
    }

    if (!user.isActive && !this.canActivateUsers) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para activar usuarios.');
      return;
  }

    const nextState = !user.isActive;
    try {
      await this.workboardApi.setUserActive(user.id, nextState);
      await this.refreshUsersAndPermissions();
    } catch (error) {
      this.pushNotification('error', 'Operación fallida', error instanceof Error ? error.message : 'No fue posible actualizar el estado del usuario.');
      return;
    }

    this.pushNotification(
      'success',
      'Operación completada',
      nextState ? 'La cuenta de usuario fue activada correctamente.' : 'La cuenta de usuario fue desactivada correctamente.'
    );
  }

  resetUserCrudForm(): void {
    this.editingUserId = null;
    this.userCrudForm = this.createEmptyForm();
  }

  async togglePermission(permission: UserPermission): Promise<void> {
    this.notification = null;

    if (!this.canManagePermissions) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para administrar permisos de usuario.');
      return;
    }

    const user = this.selectedPermissionUser;
    if (!user) {
      return;
    }

    if (this.isProtectedAdminUser(user)) {
      this.pushNotification('error', 'Operación no permitida', 'Las cuentas de administración protegidas conservan todos los permisos por política del sistema.');
      return;
    }

    const email = user.email.toLowerCase();
    const current = this.getPermissionsForEmail(email);
    const hasPermission = current.includes(permission);

    this.permissionsByUser[email] = hasPermission
      ? current.filter((item) => item !== permission)
      : [...current, permission];

    try {
      const saved = await this.workboardApi.setUserPermissions(user.id, this.permissionsByUser[email]);
      this.permissionsByUser[email] = saved.filter((item): item is UserPermission => this.allPermissions.includes(item as UserPermission));
      await this.refreshUsersAndPermissions();
    } catch (error) {
      this.permissionsByUser[email] = current;
      this.pushNotification('error', 'Operación fallida', error instanceof Error ? error.message : 'No fue posible actualizar permisos.');
      return;
    }
  }

  hasPermissionInSelectedGroup(permission: UserPermission): boolean {
    return this.selectedPermissionGroupPermissions.includes(permission);
  }

  async togglePermissionInSelectedGroup(permission: UserPermission): Promise<void> {
    this.notification = null;

    if (!this.canManagePermissions) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para administrar permisos por grupo.');
      return;
    }

    const user = this.selectedPermissionUser;
    const groupId = this.selectedPermissionGroupId;
    if (!user || groupId === null) {
      return;
    }

    if (this.isProtectedAdminUser(user)) {
      this.pushNotification('error', 'Operación no permitida', 'Las cuentas de administración protegidas conservan todos los permisos por política del sistema.');
      return;
    }

    const email = user.email.toLowerCase();
    const groupKey = String(groupId);
    const current = this.selectedPermissionGroupPermissions;
    const next = current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission];

    const currentGroupMap = this.permissionsByUserAndGroup[email] ?? {};
    this.permissionsByUserAndGroup[email] = {
      ...currentGroupMap,
      [groupKey]: [...new Set(next)]
    };

    this.persistGroupScopedPermissions();
    this.pushNotification('success', 'Operación completada', `Permisos por grupo actualizados para ${user.username}.`);
  }

  async addAllPermissionsToSelectedGroup(): Promise<void> {
    if (!this.canManagePermissions) {
      return;
    }

    const user = this.selectedPermissionUser;
    const groupId = this.selectedPermissionGroupId;
    if (!user || groupId === null) {
      return;
    }

    if (this.isProtectedAdminUser(user)) {
      this.pushNotification('error', 'Operación no permitida', 'Las cuentas de administración protegidas no pueden ser modificadas.');
      return;
    }

    const email = user.email.toLowerCase();
    const groupKey = String(groupId);
    const currentGroupMap = this.permissionsByUserAndGroup[email] ?? {};
    this.permissionsByUserAndGroup[email] = {
      ...currentGroupMap,
      [groupKey]: [...this.allPermissions]
    };

    this.persistGroupScopedPermissions();
    this.pushNotification('success', 'Operación completada', `Todos los permisos se asignaron en ${this.selectedPermissionGroupName}.`);
  }

  async removeAllPermissionsFromSelectedGroup(): Promise<void> {
    if (!this.canManagePermissions) {
      return;
    }

    const user = this.selectedPermissionUser;
    const groupId = this.selectedPermissionGroupId;
    if (!user || groupId === null) {
      return;
    }

    if (this.isProtectedAdminUser(user)) {
      this.pushNotification('error', 'Operación no permitida', 'Las cuentas de administración protegidas no pueden ser modificadas.');
      return;
    }

    const email = user.email.toLowerCase();
    const groupKey = String(groupId);
    const currentGroupMap = this.permissionsByUserAndGroup[email] ?? {};
    this.permissionsByUserAndGroup[email] = {
      ...currentGroupMap,
      [groupKey]: []
    };

    this.persistGroupScopedPermissions();
    this.pushNotification('success', 'Operación completada', `Se removieron permisos por grupo en ${this.selectedPermissionGroupName}.`);
  }

  async addAllPermissionsToSelected(): Promise<void> {
    if (!this.canManagePermissions || !this.selectedPermissionUser) {
      return;
    }

    const email = this.selectedPermissionUser.email.toLowerCase();
    try {
      const saved = await this.workboardApi.setUserPermissions(this.selectedPermissionUser.id, [...this.allPermissions]);
      this.permissionsByUser[email] = saved.filter((item): item is UserPermission => this.allPermissions.includes(item as UserPermission));
      await this.refreshUsersAndPermissions();
    } catch (error) {
      this.pushNotification('error', 'Operación fallida', error instanceof Error ? error.message : 'No fue posible asignar permisos.');
      return;
    }
  }

  async removeAllPermissionsFromSelected(): Promise<void> {
    if (!this.canManagePermissions || !this.selectedPermissionUser) {
      return;
    }

    const user = this.selectedPermissionUser;
    if (user.username === 'superAdmin' || user.email.toLowerCase() === this.superAdminEmail) {
      return;
    }

    const email = user.email.toLowerCase();
    try {
      await this.workboardApi.setUserPermissions(user.id, []);
      this.permissionsByUser[email] = [];
      await this.refreshUsersAndPermissions();
    } catch (error) {
      this.pushNotification('error', 'Operación fallida', error instanceof Error ? error.message : 'No fue posible remover permisos.');
      return;
    }
  }

  hasPermission(permission: UserPermission): boolean {
    const user = this.selectedPermissionUser;
    if (!user) {
      return false;
    }

    return this.getPermissionsForEmail(user.email).includes(permission);
  }

  permissionDisplayName(permission: UserPermission): string {
    const labels: Record<UserPermission, string> = {
      'ticket:add': 'Crear tickets',
      'ticket:view': 'Ver tickets',
      'ticket:edit': 'Editar ticket completo',
      'ticket:edit:status': 'Cambiar estado de ticket',
      'ticket:edit:comment': 'Comentar ticket',
      'ticket:edit:priority': 'Cambiar prioridad de ticket',
      'ticket:edit:deadline': 'Cambiar fecha limite de ticket',
      'ticket:edit:assign': 'Reasignar ticket',
      'ticket:delete': 'Eliminar tickets',
      'group:add': 'Crear grupos',
      'group:view': 'Ver grupos',
      'group:edit': 'Editar grupos',
      'group:remove': 'Eliminar grupos',
      'group:add:members': 'Agregar miembros a grupos',
      'group:remove:members': 'Remover miembros de grupos',
      'user:add': 'Crear usuarios',
      'user:view:all': 'Ver todos los usuarios',
      'user:edit': 'Editar usuarios',
      'user:remove': 'Eliminar usuarios',
      'user:edit:permissions': 'Administrar permisos de usuario',
      'user:deactivate': 'Desactivar usuarios',
      'user:activate': 'Activar usuarios'
    };

    return labels[permission] ?? permission;
  }

  private hasCurrentPermission(permission: UserPermission): boolean {
    return this.currentUserPermissions.includes(permission);
  }


  private pushNotification(severity: 'success' | 'error', summary: string, detail: string): void {
    this.notification = { severity, text: `${summary}: ${detail}` };
    this.cdr.markForCheck();
  }

  private syncContextFromRoute(): void {
    this.route.queryParamMap.subscribe((params) => {
      const section = params.get('section');
      this.requestedSection = section === 'admin' ? 'admin' : 'profile';

      const fromGroupId = Number(params.get('fromGroupId'));
      this.sourceGroupId = Number.isFinite(fromGroupId) ? fromGroupId : null;

      if (this.requestedSection === 'admin' && !this.canManageUsers) {
        this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con permisos de administración de usuarios para acceder a esta sección.');
      }

      this.cdr.markForCheck();
    });
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authSession.getCurrentUser({
      email: this.superAdminEmail,
      displayName: 'superAdmin'
    });
  }

  private async loadUsers(): Promise<void> {
    try {
      const apiUsers = await this.workboardApi.listUsers();
      this.users = apiUsers.map((user) => this.mapApiUserToView(user));
      this.cdr.markForCheck();
    } catch (error) {
      this.users = [];
      this.pushNotification('error', 'Carga fallida', error instanceof Error ? error.message : 'No fue posible cargar usuarios desde el backend.');
    }
  }

  private ensureSuperAdminUser(): void {
    const exists = this.users.some((user) => user.username === 'superAdmin' || user.email.toLowerCase() === this.superAdminEmail);
    if (exists) {
      return;
    }

    const nextId = this.users.length ? Math.max(...this.users.map((user) => user.id)) + 1 : 1;
    this.users = [
      {
        id: nextId,
        username: 'superAdmin',
        fullName: 'superAdmin',
        address: 'Centro de Control de Seguridad',
        phone: '5599001122',
        birthDate: '1995-01-01',
        email: this.superAdminEmail,
        role: 'superAdmin',
        team: 'Seguridad web',
        isActive: true
      },
      ...this.users
    ];
  }

  private async loadPermissions(): Promise<void> {
    this.permissionsByUser = {};

    try {
      await Promise.all(this.users.map(async (user) => {
        const permissions = await this.workboardApi.getUserPermissions(user.id);
        this.permissionsByUser[user.email.toLowerCase()] = permissions
          .filter((item): item is UserPermission => this.allPermissions.includes(item as UserPermission));
      }));
      this.cdr.markForCheck();
    } catch (error) {
      this.permissionsByUser = {};
      this.pushNotification('error', 'Carga fallida', error instanceof Error ? error.message : 'No fue posible cargar permisos desde el backend.');
    }
  }

  private async refreshUsersAndPermissions(): Promise<void> {
    const previousSelectedUserId = this.selectedPermissionUserId;
    await this.loadUsers();
    await this.loadPermissions();

    if (previousSelectedUserId !== null && this.users.some((user) => user.id === previousSelectedUserId)) {
      this.selectedPermissionUserId = previousSelectedUserId;
    } else {
      this.selectedPermissionUserId = this.users[0]?.id ?? null;
    }

    if (this.selectedPermissionGroupId === null || !this.permissionGroups.some((group) => group.id === this.selectedPermissionGroupId)) {
      this.selectedPermissionGroupId = this.permissionGroups[0]?.id ?? null;
    }

    this.ensureCurrentProfile();
    this.cdr.markForCheck();
  }

  private async loadPermissionGroups(): Promise<void> {
    try {
      const groups = await this.workboardApi.listGroups();
      this.permissionGroups = groups
        .filter((group) => typeof group.id === 'number' && typeof group.name === 'string')
        .map((group) => ({ id: group.id, name: group.name }))
        .sort((left, right) => left.id - right.id);
    } catch {
      this.permissionGroups = [];
    }
  }

  private loadGroupScopedPermissions(): void {
    const raw = this.storage.getJson<Record<string, unknown>>(this.groupPermissionStorageKey);
    if (!raw || typeof raw !== 'object') {
      this.permissionsByUserAndGroup = {};
      return;
    }

    const normalized: GroupScopedPermissionMap = {};
    for (const [email, groupMap] of Object.entries(raw)) {
      if (!groupMap || typeof groupMap !== 'object' || Array.isArray(groupMap)) {
        normalized[email.toLowerCase()] = {};
        continue;
      }

      const perGroup: Record<string, UserPermission[]> = {};
      for (const [groupId, permissions] of Object.entries(groupMap as Record<string, unknown>)) {
        if (!Array.isArray(permissions)) {
          perGroup[groupId] = [];
          continue;
        }

        perGroup[groupId] = [...new Set(
          permissions
            .filter((item): item is string => typeof item === 'string')
            .flatMap((item) => this.migrateLegacyPermission(item))
        )];
      }

      normalized[email.toLowerCase()] = perGroup;
    }

    this.permissionsByUserAndGroup = normalized;
  }

  private persistGroupScopedPermissions(): void {
    this.storage.setJson(this.groupPermissionStorageKey, this.permissionsByUserAndGroup);
  }

  private ensurePermissionsForUsers(): void {
    for (const user of this.users) {
      const key = user.email.toLowerCase();
      if (!Array.isArray(this.permissionsByUser[key])) {
        this.permissionsByUser[key] = [];
      }
    }

    this.permissionsByUser[this.superAdminEmail] = [...this.allPermissions];
  }

  private async loadTickets(): Promise<void> {
    try {
      const apiTickets = await this.workboardApi.listTickets();
      this.tickets = apiTickets.map((ticket) => ({
        id: ticket.id,
        groupId: ticket.group_id,
        title: ticket.title,
        description: ticket.description ?? '',
        createdBy: ticket.created_by ? `Usuario #${ticket.created_by}` : this.currentUser.email,
        status: this.normalizeTicketStatus(ticket.status),
        assignedTo: ticket.assigned_to ? `Usuario #${ticket.assigned_to}` : '',
        priority: 'Media',
        createdAt: ticket.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        dueDate: ticket.updated_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        comments: [],
        history: []
      }));
      this.cdr.markForCheck();
    } catch {
      this.tickets = [];
      this.cdr.markForCheck();
    }
  }

  private mapApiUserToView(user: {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    full_name?: string | null;
    address?: string | null;
    phone?: string | null;
    birth_date?: string | null;
    role?: string | null;
    team?: string | null;
  }): UserRecord {
    return {
      id: Number(user.id),
      username: user.username,
      fullName: user.full_name ?? user.username,
      address: user.address ?? '',
      phone: user.phone ?? '',
      birthDate: user.birth_date ?? '2000-01-01',
      email: user.email,
      role: user.role ?? 'Miembro',
      team: user.team ?? 'Seguridad web',
      isActive: Boolean(user.is_active)
    };
  }

  private toApiUserPayload(user: UserRecord): {
    username: string;
    email: string;
    full_name: string;
    address: string;
    phone: string;
    birth_date: string;
    role: string;
    team: string;
  } {
    return {
      username: user.username,
      email: user.email,
      full_name: user.fullName,
      address: user.address,
      phone: user.phone,
      birth_date: user.birthDate,
      role: user.role,
      team: user.team
    };
  }

  private normalizeTicketStatus(status: string): TicketStatus {
    switch (status) {
      case 'in-progress':
        return 'En progreso';
      case 'review':
        return 'Revisión';
      case 'blocked':
        return 'Bloqueado';
      case 'done':
        return 'Hecho';
      default:
        return 'Pendiente';
    }
  }

  private ensureCurrentProfile(): void {
    const currentEmail = this.currentUser.email.trim().toLowerCase();
    const matched = this.users.find((user) => user.email.trim().toLowerCase() === currentEmail);

    if (matched) {
      this.profileForm = { ...matched, birthDate: matched.birthDate };
      return;
    }

    const fallbackId = this.users.length ? Math.max(...this.users.map((user) => user.id)) + 1 : 1;
    this.profileForm = {
      id: fallbackId,
      username: this.currentUser.email.split('@')[0] || 'usuario',
      fullName: this.currentUser.displayName,
      address: 'Sin dirección registrada',
      phone: '0000000000',
      birthDate: '2000-01-01',
      email: this.currentUser.email,
      role: 'Miembro',
      team: 'Seguridad web'
    };
  }


  private normalizePermissionsMap(source: Record<string, unknown>): Record<string, UserPermission[]> {
    const result: Record<string, UserPermission[]> = {};
    const allowed = new Set(this.allPermissions);

    for (const [email, permissions] of Object.entries(source)) {
      if (!Array.isArray(permissions)) {
        result[email.toLowerCase()] = [];
        continue;
      }

      result[email.toLowerCase()] = [...new Set(
        permissions
          .flatMap((perm) => (typeof perm === 'string' ? this.migrateLegacyPermission(perm) : []))
          .filter((perm): perm is UserPermission => allowed.has(perm))
      )];
    }

    return result;
  }

  private migrateLegacyPermission(permission: string): UserPermission[] {
    const direct = permission as UserPermission;
    if (this.allPermissions.includes(direct)) {
      return [direct];
    }

    const legacyMap: Record<string, UserPermission[]> = {
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

  private getPermissionsForEmail(email: string): UserPermission[] {
    const key = email.toLowerCase();
    if (key === this.superAdminEmail) {
      return [...this.allPermissions];
    }

    return this.permissionsByUser[key] ?? [];
  }

  private getUserFormValidationMessage(form: UserFormModel, birthDateIso: string, scope: 'perfil' | 'usuario'): string {
    if (
      form.username.trim().length === 0 ||
      form.fullName.trim().length === 0 ||
      form.address.trim().length === 0 ||
      birthDateIso.length === 0 ||
      form.email.trim().length === 0 ||
      form.phone.trim().length === 0 ||
      form.role.trim().length === 0 ||
      form.team.trim().length === 0
    ) {
      return `Completa todos los campos requeridos del ${scope}.`;
    }

    if (!this.validation.isValidEmail(form.email)) {
      return 'Ingresa una dirección de correo electrónico válida.';
    }

    if (!this.validation.isValidPhone(form.phone)) {
      return 'Ingresa un número telefónico válido de 7 a 15 dígitos.';
    }

    return `Verifica la informacion capturada en el ${scope} e intenta nuevamente.`;
  }

  private normalizeBirthDate(v: string | Date | null): string {
    if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : '';
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
    return '';
  }

  private createEmptyForm(): UserFormModel {
    return {
      id: 0,
      username: '',
      fullName: '',
      address: '',
      phone: '',
      birthDate: null,
      email: '',
      role: '',
      team: ''
    };
  }

  private normalizeUser(user: unknown, index: number): UserRecord {
    const source = typeof user === 'object' && user !== null ? (user as Partial<UserRecord> & { name?: string }) : {};
    let name = `Usuario ${index + 1}`;

    if (typeof source.name === 'string') {
      name = source.name;
    }

    if (typeof source.fullName === 'string') {
      name = source.fullName;
    }

    return {
      id: typeof source.id === 'number' ? source.id : index + 1,
      username: typeof source.username === 'string' ? source.username : name.toLowerCase().replaceAll(' ', '.'),
      fullName: name,
      address: typeof source.address === 'string' ? source.address : 'Sin dirección registrada',
      phone: typeof source.phone === 'string' ? source.phone : '0000000000',
      birthDate: typeof source.birthDate === 'string' ? source.birthDate : '2000-01-01',
      email: typeof source.email === 'string' ? source.email.toLowerCase() : `user${index + 1}@example.com`,
      role: typeof source.role === 'string' ? source.role : 'Miembro',
      team: typeof source.team === 'string' ? source.team : 'Sin equipo',
      isActive: typeof source.isActive === 'boolean' ? source.isActive : true
    };
  }

  private readonly STATUS_SEV: Record<TicketStatus, 'warn' | 'info' | 'secondary' | 'success'> = {
    Pendiente: 'warn', 'En progreso': 'info', 'Revisión': 'info', Bloqueado: 'secondary', Hecho: 'success'
  };

  private readonly PRIORITY_SEV: Record<TicketPriority, 'danger' | 'warn' | 'secondary' | 'info' | 'success'> = {
    Urgente: 'danger', Alta: 'warn', 'Media-alta': 'warn', Media: 'secondary', 'Media-baja': 'info', Baja: 'info', 'Muy baja': 'success'
  };

  statusSeverity(s: TicketStatus) { return this.STATUS_SEV[s]; }
  prioritySeverity(p: TicketPriority) { return this.PRIORITY_SEV[p]; }
}
