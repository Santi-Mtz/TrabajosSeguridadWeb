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
import { StorageService } from '../../services/storage.service';
import { ValidationService } from '../../services/validation.service';
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

type UserPermission =
  | 'group:add'
  | 'group:edit'
  | 'group:delete'
  | 'ticket:create'
  | 'ticket:edit'
  | 'ticket:delete'
  | 'user:create'
  | 'user:edit'
  | 'user:delete'
  | 'user:permissions';

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
    private readonly storage: StorageService,
    private readonly authSession: AuthSessionService,
    private readonly validation: ValidationService
  ) {}

  private readonly storageKey = 'crud.users';
  private readonly ticketsStorageKey = 'board.tickets';
  private readonly permissionsStorageKey = 'crud.user.permissions';
  private readonly superAdminEmail = 'superadmin@seguridadweb.com';

  readonly allPermissions: UserPermission[] = [
    'group:add',
    'group:edit',
    'group:delete',
    'ticket:create',
    'ticket:edit',
    'ticket:delete',
    'user:create',
    'user:edit',
    'user:delete',
    'user:permissions'
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
      team: 'Seguridad web'
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
      team: 'Seguridad web'
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
      team: 'Seguridad web'
    }
  ];

  private readonly defaultPermissionsByUser: Record<string, UserPermission[]> = {
    [this.superAdminEmail]: [...this.allPermissions],
    'admin@seguridadweb.com': ['group:add', 'group:edit', 'ticket:create', 'ticket:edit', 'user:edit'],
    'santiago.martinez@example.com': ['ticket:create', 'ticket:edit']
  };

  notification: { severity: 'success' | 'error'; text: string } | null = null;
  currentUser: AuthSessionUser = {
    email: this.superAdminEmail,
    displayName: 'superAdmin'
  };

  users: UserRecord[] = [...this.defaultUsers];
  tickets: TicketRecord[] = [];
  permissionsByUser: Record<string, UserPermission[]> = { ...this.defaultPermissionsByUser };

  profileForm: UserFormModel = this.createEmptyForm();
  userCrudForm: UserFormModel = this.createEmptyForm();

  editingUserId: number | null = null;
  selectedPermissionUserId: number | null = null;
  requestedSection: 'profile' | 'admin' = 'profile';
  sourceGroupId: number | null = null;

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadUsers();
    this.ensureSuperAdminUser();
    this.loadPermissions();
    this.ensurePermissionsForUsers();
    this.loadTickets();
    this.ensureCurrentProfile();
    this.resetUserCrudForm();
    this.selectedPermissionUserId = this.users[0]?.id ?? null;
    this.syncContextFromRoute();
  }

  get currentProfile(): UserFormModel {
    return this.profileForm;
  }

  get isSuperAdmin(): boolean {
    const byIdentity = this.currentUser.email.trim().toLowerCase() === this.superAdminEmail;
    const byUsername = this.profileForm.username.trim() === 'superAdmin';
    return byIdentity || byUsername;
  }

  get currentUserPermissions(): UserPermission[] {
    return this.getPermissionsForEmail(this.currentUser.email);
  }

  get hasUserCrudPermissions(): boolean {
    return this.hasCurrentPermission('user:create') &&
      this.hasCurrentPermission('user:edit') &&
      this.hasCurrentPermission('user:delete');
  }

  get canManagePermissions(): boolean {
    return this.hasCurrentPermission('user:permissions');
  }

  get canCreateUsers(): boolean {
    return this.hasCurrentPermission('user:create');
  }

  get canEditUsers(): boolean {
    return this.hasCurrentPermission('user:edit');
  }

  get canDeleteUsers(): boolean {
    return this.hasCurrentPermission('user:delete');
  }

  get canManageUsers(): boolean {
    return this.hasUserCrudPermissions;
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

  get assignedTickets(): TicketRecord[] {
    const identity = this.currentUser.email.trim().toLowerCase();
    const displayName = this.currentUser.displayName.trim().toLowerCase();

    return this.tickets
      .filter((ticket) => {
        const assigned = ticket.assignedTo.trim().toLowerCase();
        return assigned === identity || assigned === displayName;
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

  saveProfile(): void {
    this.notification = null;

    if (!this.isProfileValid) {
      this.pushNotification('error', 'Error', this.getUserFormValidationMessage(this.profileForm, this.profileBirthDateIso, 'perfil'));
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
      team: this.profileForm.team.trim()
    };

    const existingIndex = this.users.findIndex((user) => user.id === normalized.id || user.email === normalized.email);

    if (existingIndex >= 0) {
      this.users = this.users.map((user, index) => (index === existingIndex ? normalized : user));
    } else {
      const nextId = this.users.length ? Math.max(...this.users.map((user) => user.id)) + 1 : 1;
      this.users = [...this.users, { ...normalized, id: nextId }];
      this.profileForm.id = nextId;
    }

    this.persistUsers();

    this.authSession.setCurrentUser({
      email: normalized.email,
      displayName: normalized.fullName
    });

    this.currentUser = {
      email: normalized.email,
      displayName: normalized.fullName
    };

    this.pushNotification('success', 'Actualizado', 'Perfil actualizado correctamente.');
  }

  resetProfile(): void {
    this.ensureCurrentProfile();
  }

  saveUserCrud(): void {
    this.notification = null;

    if (!this.canManageUsers) {
      this.pushNotification('error', 'Acceso denegado', 'Necesitas permisos CRUD de usuario para gestionar usuarios.');
      return;
    }

    if (!this.isCrudFormValid) {
      this.pushNotification('error', 'Error', this.getUserFormValidationMessage(this.userCrudForm, this.crudBirthDateIso, 'usuario'));
      return;
    }

    const normalized: UserRecord = {
      id: this.userCrudForm.id,
      username: this.userCrudForm.username.trim(),
      fullName: this.userCrudForm.fullName.trim(),
      address: this.userCrudForm.address.trim(),
      phone: this.userCrudForm.phone.trim(),
      birthDate: this.crudBirthDateIso,
      email: this.userCrudForm.email.trim().toLowerCase(),
      role: this.userCrudForm.role.trim(),
      team: this.userCrudForm.team.trim()
    };

    const duplicateEmail = this.users.some(
      (user) => user.id !== normalized.id && user.email.toLowerCase() === normalized.email
    );

    if (duplicateEmail) {
      this.pushNotification('error', 'Error', 'Ya existe un usuario con ese correo.');
      return;
    }

    if (this.editingUserId === null) {
      if (!this.canCreateUsers) {
        this.pushNotification('error', 'Acceso denegado', 'No tienes permiso user:create.');
        return;
      }

      const nextId = this.users.length ? Math.max(...this.users.map((user) => user.id)) + 1 : 1;
      const newUser: UserRecord = { ...normalized, id: nextId };
      this.users = [...this.users, newUser];
      this.permissionsByUser[newUser.email.toLowerCase()] = [];
      this.pushNotification('success', 'Creado', 'Usuario creado correctamente.');
    } else {
      if (!this.canEditUsers) {
        this.pushNotification('error', 'Acceso denegado', 'No tienes permiso user:edit.');
        return;
      }

      const previous = this.users.find((user) => user.id === this.editingUserId);
      this.users = this.users.map((user) => (user.id === this.editingUserId ? { ...normalized, id: user.id } : user));

      if (previous && previous.email !== normalized.email) {
        const oldKey = previous.email.toLowerCase();
        const newKey = normalized.email.toLowerCase();
        const existingPerms = this.permissionsByUser[oldKey] ?? [];
        delete this.permissionsByUser[oldKey];
        this.permissionsByUser[newKey] = [...new Set(existingPerms)];
      }

      this.pushNotification('success', 'Actualizado', 'Usuario actualizado correctamente.');
    }

    this.persistUsers();
    this.persistPermissions();
    this.resetUserCrudForm();
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

  deleteUserRecord(user: UserRecord): void {
    this.notification = null;

    if (!this.canDeleteUsers) {
      this.pushNotification('error', 'Acceso denegado', 'No tienes permiso user:delete.');
      return;
    }

    if (user.username === 'superAdmin' || user.email.toLowerCase() === this.superAdminEmail) {
      this.pushNotification('error', 'Error', 'No se puede eliminar el usuario superAdmin.');
      return;
    }

    if (user.email.toLowerCase() === this.currentUser.email.toLowerCase()) {
      this.pushNotification('error', 'Error', 'No puedes eliminar tu propio usuario activo.');
      return;
    }

    this.users = this.users.filter((item) => item.id !== user.id);
    delete this.permissionsByUser[user.email.toLowerCase()];

    if (this.selectedPermissionUserId === user.id) {
      this.selectedPermissionUserId = this.users[0]?.id ?? null;
    }

    this.persistUsers();
    this.persistPermissions();
    this.resetUserCrudForm();
    this.pushNotification('success', 'Eliminado', 'Usuario eliminado correctamente.');
  }

  resetUserCrudForm(): void {
    this.editingUserId = null;
    this.userCrudForm = this.createEmptyForm();
  }

  togglePermission(permission: UserPermission): void {
    this.notification = null;

    if (!this.canManagePermissions) {
      this.pushNotification('error', 'Acceso denegado', 'No tienes permiso user:permissions.');
      return;
    }

    const user = this.selectedPermissionUser;
    if (!user) {
      return;
    }

    if (user.username === 'superAdmin' || user.email.toLowerCase() === this.superAdminEmail) {
      this.pushNotification('error', 'Error', 'superAdmin siempre conserva todos los permisos.');
      return;
    }

    const email = user.email.toLowerCase();
    const current = this.getPermissionsForEmail(email);
    const hasPermission = current.includes(permission);

    this.permissionsByUser[email] = hasPermission
      ? current.filter((item) => item !== permission)
      : [...current, permission];

    this.persistPermissions();
  }

  addAllPermissionsToSelected(): void {
    if (!this.canManagePermissions || !this.selectedPermissionUser) {
      return;
    }

    const email = this.selectedPermissionUser.email.toLowerCase();
    this.permissionsByUser[email] = [...this.allPermissions];
    this.persistPermissions();
  }

  removeAllPermissionsFromSelected(): void {
    if (!this.canManagePermissions || !this.selectedPermissionUser) {
      return;
    }

    const user = this.selectedPermissionUser;
    if (user.username === 'superAdmin' || user.email.toLowerCase() === this.superAdminEmail) {
      return;
    }

    const email = user.email.toLowerCase();
    this.permissionsByUser[email] = [];
    this.persistPermissions();
  }

  hasPermission(permission: UserPermission): boolean {
    const user = this.selectedPermissionUser;
    if (!user) {
      return false;
    }

    return this.getPermissionsForEmail(user.email).includes(permission);
  }

  private hasCurrentPermission(permission: UserPermission): boolean {
    return this.currentUserPermissions.includes(permission);
  }

  private persist(key: string, value: unknown): void {
    this.storage.setJson(key, value);
  }

  private pushNotification(severity: 'success' | 'error', summary: string, detail: string): void {
    this.notification = { severity, text: `${summary}: ${detail}` };
  }

  private syncContextFromRoute(): void {
    this.route.queryParamMap.subscribe((params) => {
      const section = params.get('section');
      this.requestedSection = section === 'admin' ? 'admin' : 'profile';

      const fromGroupId = Number(params.get('fromGroupId'));
      this.sourceGroupId = Number.isFinite(fromGroupId) ? fromGroupId : null;

      if (this.requestedSection === 'admin' && !this.canManageUsers) {
        this.pushNotification('error', 'Acceso denegado', 'No tienes permisos CRUD de usuario para la gestión administrativa.');
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

  private loadUsers(): void {
    try {
      const parsed = this.storage.getJson<unknown[]>(this.storageKey);
      if (!parsed) {
        return;
      }

      if (!Array.isArray(parsed)) {
        throw new TypeError('Formato inválido');
      }

      this.users = parsed.map((user, index) => this.normalizeUser(user, index));
    } catch {
      this.users = [...this.defaultUsers];
      this.persistUsers();
      this.pushNotification('error', 'Error', 'Se restauraron usuarios por datos inválidos en almacenamiento local.');
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
        team: 'Seguridad web'
      },
      ...this.users
    ];
    this.persistUsers();
  }

  private loadPermissions(): void {
    try {
      const parsed = this.storage.getJson<Record<string, unknown>>(this.permissionsStorageKey);
      if (!parsed) {
        this.permissionsByUser = { ...this.defaultPermissionsByUser };
        this.persistPermissions();
        return;
      }

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new TypeError('Formato inválido');
      }

      this.permissionsByUser = this.normalizePermissionsMap(parsed);
    } catch {
      this.permissionsByUser = { ...this.defaultPermissionsByUser };
      this.persistPermissions();
    }
  }

  private ensurePermissionsForUsers(): void {
    for (const user of this.users) {
      const key = user.email.toLowerCase();
      if (!Array.isArray(this.permissionsByUser[key])) {
        this.permissionsByUser[key] = [];
      }
    }

    this.permissionsByUser[this.superAdminEmail] = [...this.allPermissions];
    this.persistPermissions();
  }

  private loadTickets(): void {
    try {
      const parsed = this.storage.getJson<TicketRecord[]>(this.ticketsStorageKey);
      if (!parsed) {
        this.tickets = [];
        return;
      }

      if (!Array.isArray(parsed)) {
        throw new TypeError('Formato inválido');
      }

      this.tickets = parsed;
    } catch {
      this.tickets = [];
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

  private persistUsers(): void { this.persist(this.storageKey, this.users); }
  private persistPermissions(): void { this.persist(this.permissionsStorageKey, this.permissionsByUser); }

  private normalizePermissionsMap(source: Record<string, unknown>): Record<string, UserPermission[]> {
    const result: Record<string, UserPermission[]> = {};
    const allowed = new Set(this.allPermissions);

    for (const [email, permissions] of Object.entries(source)) {
      if (!Array.isArray(permissions)) {
        result[email.toLowerCase()] = [];
        continue;
      }

      result[email.toLowerCase()] = permissions
        .filter((perm): perm is UserPermission => typeof perm === 'string' && allowed.has(perm as UserPermission));
    }

    return result;
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
      return `Completa todos los campos del ${scope}.`;
    }

    if (!this.validation.isValidEmail(form.email)) {
      return 'Ingresa un correo electrónico válido.';
    }

    if (!this.validation.isValidPhone(form.phone)) {
      return 'Ingresa un teléfono válido de 7 a 15 dígitos.';
    }

    return `Completa correctamente los campos del ${scope}.`;
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
      team: typeof source.team === 'string' ? source.team : 'Sin equipo'
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
