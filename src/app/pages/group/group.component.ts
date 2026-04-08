import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { AuthSessionService, AuthSessionUser } from '../../services/auth-session.service';
import { AuthorizationService } from '../../services/authorization.service';
import { ValidationService } from '../../services/validation.service';
import { GroupBoardDataService } from './group-board-data.service';
import { GroupRulesService } from './group-rules.service';
import { GroupTicketFacadeService } from './group-ticket-facade.service';
import {
  GROUP_PERMISSION_KEYS,
  GROUP_PRIORITIES,
  GROUP_STATUSES,
  PRIORITY_SEVERITY,
  QUICK_FILTER_OPTIONS,
  STATUS_SEVERITY,
  GroupPermission,
  GroupPermissionsMap,
  GroupPriority,
  GroupRecord,
  GroupStatus,
  QuickFilter,
  TicketFormModel,
  TicketRecord,
  TicketSort
} from './group.models';
import {
  createEmptyTicketForm,
  createFormFromTicket,
  endOfDay,
  parseIsoDate,
  sortGroupTickets,
  startOfDay,
  toValidDate
} from './group-ticket.utils';

@Component({
  selector: 'app-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    SelectButtonModule,
    DialogModule,
    TextareaModule,
    DatePickerModule,
    DragDropModule,
    TooltipModule
  ],
  templateUrl: './group.component.html',
  styleUrl: './group.component.css'
})
export class GroupComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly authSession: AuthSessionService,
    private readonly authorization: AuthorizationService,
    private readonly validation: ValidationService,
    private readonly groupBoardData: GroupBoardDataService,
    private readonly groupRules: GroupRulesService,
    private readonly groupTicketFacade: GroupTicketFacadeService
  ) {}

  readonly statuses = GROUP_STATUSES;
  readonly priorities = GROUP_PRIORITIES;

  notification: { severity: 'success' | 'error'; text: string } | null = null;
  groups: GroupRecord[] = [];
  tickets: TicketRecord[] = [];
  membersByGroup: Record<number, string[]> = {};
  permissionsByGroup: GroupPermissionsMap = {};
  currentUser: AuthSessionUser = { email: 'admin@seguridadweb.com', displayName: 'Administrador' };

  selectedGroupId = 1;
  viewMode: 'kanban' | 'list' = 'kanban';

  viewModeOptions = [
    { label: 'Kanban', value: 'kanban' },
    { label: 'Lista', value: 'list' }
  ];

  filterStatus: GroupStatus | null = null;
  filterPriority: GroupPriority | null = null;
  filterAssignedTo: string | null = null;
  quickFilter: QuickFilter = 'all';
  filterCreatedFrom: Date | null = null;
  filterCreatedTo: Date | null = null;
  filterDueFrom: Date | null = null;
  filterDueTo: Date | null = null;
  filterSort: TicketSort = 'createdDesc';

  readonly quickFilterOptions = QUICK_FILTER_OPTIONS;

  createDialogVisible = false;
  detailDialogVisible = false;
  selectedTicket: TicketRecord | null = null;
  detailComment = '';
  newMember = '';
  groupNameForm = '';
  newGroupName = '';
  showCreateGroupForm = false;

  ticketForm: TicketFormModel = createEmptyTicketForm();
  detailForm: TicketFormModel = createEmptyTicketForm();

  ngOnInit(): void {
    const initialState = this.groupBoardData.createInitialState();
    this.groups = initialState.groups;
    this.tickets = initialState.tickets;
    this.membersByGroup = initialState.membersByGroup;
    this.permissionsByGroup = initialState.permissionsByGroup;

    this.loadCurrentUser();
    this.loadGroups();
    this.loadTickets();
    this.loadMembers();
    this.loadPermissions();
    this.syncGroupFromQueryParam();
    this.groupNameForm = this.selectedGroupName;
  }

  get total(): number {
    return this.filteredTickets.length;
  }

  get statusSummaryForGroup(): Array<{ status: GroupStatus; total: number }> {
    const groupTickets = this.tickets.filter((t) => t.groupId === this.selectedGroupId);
    return this.statuses.map((status) => ({
      status,
      total: groupTickets.filter((t) => t.status === status).length
    }));
  }

  get recentTickets(): TicketRecord[] {
    return this.tickets
      .filter((t) => t.groupId === this.selectedGroupId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }

  get groupSelectOptions(): Array<{ label: string; value: number }> {
    return this.groups.map((group) => ({ label: group.name, value: group.id }));
  }

  get selectedGroupName(): string {
    return this.groups.find((group) => group.id === this.selectedGroupId)?.name ?? 'Grupo';
  }

  get currentGroup(): GroupRecord | null {
    return this.groups.find((group) => group.id === this.selectedGroupId) ?? null;
  }

  get currentGroupPermissions(): GroupPermission[] {
    return GROUP_PERMISSION_KEYS.filter((permission) =>
      this.hasGroupPermission(permission)
    );
  }

  get canAddGroupMembers(): boolean {
    return this.hasGroupPermission('group:add:members');
  }

  get canCreateTickets(): boolean {
    return this.authorization.canCreateTickets();
  }

  get canEditTicketsByPermission(): boolean {
    return this.authorization.has('ticket:edit');
  }

  get canChangeTicketStatusByPermission(): boolean {
    return this.authorization.has('ticket:edit:status');
  }

  get canCommentTicketByPermission(): boolean {
    return this.authorization.has('ticket:edit:comment');
  }

  get canOpenUserManagement(): boolean {
    return this.authorization.canAccessUserAdminSection();
  }

  get canEditGroup(): boolean {
    return this.hasGroupPermission('group:edit');
  }

  get canDeleteGroup(): boolean {
    return this.hasGroupPermission('group:remove');
  }

  get canRemoveGroupMembers(): boolean {
    return this.hasGroupPermission('group:remove:members');
  }

  get canCreateGroup(): boolean {
    return this.hasGroupPermission('group:add');
  }

  get hasGroupAdminAccess(): boolean {
    return this.canAddGroupMembers || this.canEditGroup || this.canDeleteGroup || this.canCreateGroup;
  }

  get currentPermissionSummary(): string {
    const total = this.currentGroupPermissions.length;
    if (total === 0) {
      return 'Nivel de acceso: solo lectura';
    }

    if (total === GROUP_PERMISSION_KEYS.length) {
      return 'Nivel de acceso: administrador completo';
    }

    return 'Nivel de acceso: administrador parcial';
  }

  get filteredTickets(): TicketRecord[] {
    const base = this.tickets.filter((ticket) => ticket.groupId === this.selectedGroupId);

    const filtered = base.filter((ticket) => {
      const byStatus = this.filterStatus ? ticket.status === this.filterStatus : true;
      const byPriority = this.filterPriority ? ticket.priority === this.filterPriority : true;
      const byAssignedTo = this.filterAssignedTo ? ticket.assignedTo === this.filterAssignedTo : true;
      const byQuickFilter = this.matchesQuickFilter(ticket);
      const createdDate = parseIsoDate(ticket.createdAt);
      const dueDate = parseIsoDate(ticket.dueDate);

      const byCreatedFrom = this.filterCreatedFrom
        ? createdDate.getTime() >= startOfDay(this.filterCreatedFrom).getTime()
        : true;

      const byCreatedTo = this.filterCreatedTo
        ? createdDate.getTime() <= endOfDay(this.filterCreatedTo).getTime()
        : true;

      const byDueFrom = this.filterDueFrom
        ? dueDate.getTime() >= startOfDay(this.filterDueFrom).getTime()
        : true;

      const byDueTo = this.filterDueTo
        ? dueDate.getTime() <= endOfDay(this.filterDueTo).getTime()
        : true;

      return byStatus && byPriority && byAssignedTo && byQuickFilter && byCreatedFrom && byCreatedTo && byDueFrom && byDueTo;
    });

    return [...filtered].sort((left, right) => this.sortTickets(left, right));
  }

  get groupMembers(): string[] {
    return this.membersByGroup[this.selectedGroupId] ?? [];
  }

  get assignableMemberOptions(): Array<{ label: string; value: string }> {
    const values = new Set(this.groupMembers);

    if (this.ticketForm.assignedTo.trim()) {
      values.add(this.ticketForm.assignedTo.trim());
    }

    if (this.detailForm.assignedTo.trim()) {
      values.add(this.detailForm.assignedTo.trim());
    }

    if (this.currentUser.email.trim()) {
      values.add(this.currentUser.email.trim());
    }

    return [...values].map((value) => ({ label: value, value }));
  }

  get assignedFilterOptions(): Array<{ label: string; value: string }> {
    const values = new Set(
      this.tickets
        .filter((ticket) => ticket.groupId === this.selectedGroupId)
        .map((ticket) => ticket.assignedTo)
        .filter((value) => value.trim().length > 0)
    );

    return [...values].map((value) => ({ label: value, value }));
  }

  get canEditSelectedTicket(): boolean {
    return this.selectedTicket !== null
      && this.canEditTicketsByPermission
      && this.groupRules.isTicketCreator(this.selectedTicket, this.currentUser.email, this.currentUser.displayName);
  }

  get canChangeSelectedTicketStatus(): boolean {
    if (!this.canChangeTicketStatusByPermission) {
      return false;
    }

    return this.selectedTicket !== null
      && (this.canEditSelectedTicket
        || this.groupRules.isTicketAssignee(this.selectedTicket, this.currentUser.email, this.currentUser.displayName));
  }

  get canCommentSelectedTicket(): boolean {
    if (!this.canCommentTicketByPermission) {
      return false;
    }

    return this.canChangeSelectedTicketStatus;
  }

  get selectedTicketPermissionText(): string {
    return this.groupRules.selectedTicketPermissionText(
      this.selectedTicket,
      this.canEditSelectedTicket,
      this.canChangeSelectedTicketStatus
    );
  }

  ticketsByStatus(status: GroupStatus): TicketRecord[] {
    return this.filteredTickets.filter((ticket) => ticket.status === status);
  }

  clearQuickFilter(): void {
    this.quickFilter = 'all';
  }

  clearAllFilters(): void {
    this.quickFilter = 'all';
    this.filterStatus = null;
    this.filterPriority = null;
    this.filterAssignedTo = null;
    this.filterCreatedFrom = null;
    this.filterCreatedTo = null;
    this.filterDueFrom = null;
    this.filterDueTo = null;
    this.filterSort = 'createdDesc';
  }

  toggleCreateGroupForm(): void {
    this.showCreateGroupForm = !this.showCreateGroupForm;

    if (!this.showCreateGroupForm) {
      this.newGroupName = '';
    }
  }

  openUserProfile(): void {
    void this.router.navigate(['/user'], {
      queryParams: {
        fromGroupId: this.selectedGroupId,
        section: 'profile'
      }
    });
  }

  openUserManagement(): void {
    if (!this.canOpenUserManagement) {
      return;
    }

    void this.router.navigate(['/user'], {
      queryParams: {
        fromGroupId: this.selectedGroupId,
        section: 'admin'
      }
    });
  }

  get dropListIds(): string[] {
    return this.statuses.map((status) => this.groupRules.statusColumnId(status));
  }

  colId(status: GroupStatus): string {
    return this.groupRules.statusColumnId(status);
  }

  dropTicket(event: CdkDragDrop<TicketRecord[]>, targetStatus: GroupStatus): void {
    if (event.previousContainer === event.container) {
      return;
    }

    if (!this.canChangeTicketStatusByPermission) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para actualizar tickets.');
      return;
    }

    const ticket = event.item.data as TicketRecord;

    if (!this.groupRules.canChangeTicketStatus(ticket, this.currentUser.email, this.currentUser.displayName)) {
      this.pushNotification('error', 'Operación no permitida', 'Solo la persona creadora o asignada puede cambiar el estado del ticket.');
      return;
    }

    this.tickets = this.tickets.map((t) => {
      if (t.id !== ticket.id) {
        return t;
      }

      return {
        ...t,
        status: targetStatus,
        history: [
          ...t.history,
          `${this.currentUser.displayName} cambió el estado a "${targetStatus}" (${new Date().toLocaleString()})`
        ]
      };
    });

    this.syncGroupMetrics();
    this.persistTickets();
    this.pushNotification('success', 'Operación completada', `El ticket se movió al estado "${targetStatus}".`);
  }

  onGroupChange(): void {
    this.notification = null;
    this.groupNameForm = this.selectedGroupName;
    this.showCreateGroupForm = false;
    this.newGroupName = '';
  }

  createGroup(): void {
    this.notification = null;

    if (!this.canCreateGroup) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para crear grupos.');
      return;
    }

    const name = this.newGroupName.trim();
    if (!name) {
      this.pushNotification('error', 'Validación', 'Especifica un nombre para crear el grupo.');
      return;
    }

    const exists = this.groups.some((group) => group.name.trim().toLowerCase() === name.toLowerCase());
    if (exists) {
      this.pushNotification('error', 'Validación', 'Ya existe un grupo registrado con ese nombre.');
      return;
    }

    const nextId = this.groups.length ? Math.max(...this.groups.map((group) => group.id)) + 1 : 1;
    const author = this.currentUser.displayName || this.currentUser.email;
    const memberEmail = this.currentUser.email.trim().toLowerCase();

    const newGroup: GroupRecord = {
      id: nextId,
      name,
      category: 'Workspace',
      level: 'Custom',
      author,
      members: 1,
      tickets: 0
    };

    this.groups = [...this.groups, newGroup];
    this.membersByGroup[nextId] = [memberEmail];
    this.permissionsByGroup[nextId] = {
      'group:add': [memberEmail, 'superadmin@seguridadweb.com', 'admin@seguridadweb.com'],
      'group:view': [memberEmail, 'superadmin@seguridadweb.com', 'admin@seguridadweb.com'],
      'group:edit': [memberEmail, 'superadmin@seguridadweb.com', 'admin@seguridadweb.com'],
      'group:remove': [memberEmail, 'superadmin@seguridadweb.com', 'admin@seguridadweb.com'],
      'group:add:members': [memberEmail, 'superadmin@seguridadweb.com', 'admin@seguridadweb.com'],
      'group:remove:members': [memberEmail, 'superadmin@seguridadweb.com', 'admin@seguridadweb.com']
    };

    this.persistGroups();
    this.persistMembers();
    this.persistPermissions();

    this.selectedGroupId = nextId;
    this.groupNameForm = name;
    this.newGroupName = '';
    this.showCreateGroupForm = false;
    this.pushNotification('success', 'Operación completada', 'El grupo se creó correctamente.');
  }

  saveGroupSettings(): void {
    this.notification = null;

    if (!this.canEditGroup) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para modificar grupos.');
      return;
    }

    const name = this.groupNameForm.trim();
    if (!name) {
      this.pushNotification('error', 'Validación', 'El nombre del grupo no puede estar vacío.');
      return;
    }

    const duplicated = this.groups.some(
      (group) => group.id !== this.selectedGroupId && group.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicated) {
      this.pushNotification('error', 'Validación', 'Ya existe otro grupo con ese nombre.');
      return;
    }

    this.groups = this.groups.map((group) =>
      group.id === this.selectedGroupId ? { ...group, name } : group
    );
    this.persistGroups();
    this.pushNotification('success', 'Operación completada', 'El nombre del grupo se actualizó correctamente.');
  }

  deleteCurrentGroup(): void {
    this.notification = null;

    if (!this.canDeleteGroup) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para eliminar grupos.');
      return;
    }

    if (this.groups.length <= 1) {
      this.pushNotification('error', 'Operación no permitida', 'Debe existir al menos un grupo registrado en el sistema.');
      return;
    }

    const currentGroup = this.currentGroup;
    if (!currentGroup) {
      return;
    }

    const confirmed = globalThis.confirm?.(`¿Eliminar el grupo "${currentGroup.name}" y todos sus tickets?`) ?? true;
    if (!confirmed) {
      return;
    }

    const deletedGroupId = this.selectedGroupId;
    this.groups = this.groups.filter((group) => group.id !== deletedGroupId);
    this.tickets = this.tickets.filter((ticket) => ticket.groupId !== deletedGroupId);
    delete this.membersByGroup[deletedGroupId];
    delete this.permissionsByGroup[deletedGroupId];

    this.persistGroups();
    this.persistTickets();
    this.persistMembers();
    this.persistPermissions();

    this.selectedGroupId = this.groups[0]?.id ?? 1;
    this.groupNameForm = this.selectedGroupName;
    this.pushNotification('success', 'Operación completada', 'El grupo se eliminó correctamente.');
  }

  openCreateDialog(): void {
    this.notification = null;

    if (!this.canCreateTickets) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para crear tickets.');
      return;
    }

    this.ticketForm = createEmptyTicketForm();
    this.createDialogVisible = true;
  }

  assignCreateTicketToMe(): void {
    if (!this.groupMembers.includes(this.currentUser.email)) {
      return;
    }

    this.ticketForm.assignedTo = this.currentUser.email;
  }

  saveTicket(): void {
    this.notification = null;

    if (!this.canCreateTickets) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para crear tickets.');
      return;
    }

    if (!this.isTicketFormValid()) {
      this.pushNotification('error', 'Validación', 'Completa correctamente los campos obligatorios del ticket.');
      return;
    }

    const result = this.groupTicketFacade.createTicket(
      this.tickets,
      this.ticketForm,
      this.selectedGroupId,
      this.currentUser.email,
      this.currentUser.displayName
    );

    if (!result.ticket) {
      this.pushNotification('error', 'Validación', result.error ?? 'No fue posible crear el ticket.');
      return;
    }

    const newTicket = result.ticket;

    this.tickets = [...this.tickets, newTicket];
    this.syncGroupMetrics();
    this.persistTickets();
    this.persistGroups();
    this.createDialogVisible = false;
    this.selectedTicket = newTicket;
    this.detailForm = createFormFromTicket(newTicket);
    this.detailComment = '';
    this.detailDialogVisible = true;
    this.pushNotification('success', 'Operación completada', 'El ticket se creó correctamente.');
  }

  openTicketDetail(ticket: TicketRecord): void {
    this.notification = null;
    this.selectedTicket = ticket;
    this.detailForm = createFormFromTicket(ticket);
    this.detailComment = '';
    this.detailDialogVisible = true;
  }

  saveTicketDetail(): void {
    if (!this.selectedTicket) {
      return;
    }

    if (!this.canEditSelectedTicket && !this.canChangeSelectedTicketStatus) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para modificar este ticket.');
      return;
    }

    const original = this.selectedTicket;
    const validationError = this.canEditSelectedTicket
      ? this.groupTicketFacade.validateEditableDetailForm(this.detailForm)
      : null;
    if (validationError) {
      this.pushNotification('error', 'Validación', validationError);
      return;
    }

    const editableResult = this.canEditSelectedTicket
      ? this.groupTicketFacade.applyEditableDetailChanges(original, this.detailForm, this.currentUser.displayName)
      : { ticket: { ...original }, history: [] as string[] };

    const historyChanges = [...editableResult.history];
    const nextTicket = { ...editableResult.ticket };

    if (this.canChangeSelectedTicketStatus && this.detailForm.status !== original.status) {
      nextTicket.status = this.detailForm.status;
      historyChanges.push(`${this.currentUser.displayName} cambió el estado a ${this.detailForm.status}`);
    }

    if (historyChanges.length === 0) {
      this.pushNotification('error', 'Sin cambios', 'No se detectaron cambios para guardar en el ticket.');
      return;
    }

    nextTicket.history = [
      ...original.history,
      ...historyChanges.map((entry) => `${entry} (${new Date().toLocaleString()})`)
    ];

    this.updateTicket(nextTicket);
    this.pushNotification('success', 'Operación completada', 'El ticket se actualizó correctamente.');
  }

  assignSelectedTicketToMe(): void {
    if (!this.canEditSelectedTicket || !this.groupMembers.includes(this.currentUser.email)) {
      return;
    }

    this.detailForm.assignedTo = this.currentUser.email;
  }

  addCommentToTicket(): void {
    if (!this.selectedTicket) {
      return;
    }

    if (!this.canCommentSelectedTicket) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para comentar este ticket.');
      return;
    }

    const comment = this.detailComment.trim();
    if (!comment) {
      this.pushNotification('error', 'Validación', 'Escribe un comentario antes de registrarlo en el ticket.');
      return;
    }

    const updated = this.groupTicketFacade.appendComment(
      this.tickets,
      this.selectedTicket.id,
      comment,
      this.currentUser.displayName
    );

    this.tickets = updated.tickets;

    this.persistTickets();

    this.selectedTicket = updated.selectedTicket;
    if (this.selectedTicket) {
      this.detailForm = createFormFromTicket(this.selectedTicket);
    }
    this.detailComment = '';
    this.pushNotification('success', 'Operación completada', 'El comentario se agregó al ticket correctamente.');
  }

  addMember(): void {
    this.notification = null;

    if (!this.canAddGroupMembers) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para agregar miembros al grupo.');
      return;
    }

    const member = this.newMember.trim().toLowerCase();
    if (!member) {
      this.pushNotification('error', 'Validación', 'Ingresa un correo electrónico para agregar al miembro.');
      return;
    }

    if (!this.validation.isValidEmail(member)) {
      this.pushNotification('error', 'Validación', 'Ingresa una dirección de correo electrónico válida para agregar al miembro.');
      return;
    }

    const existing = this.groupMembers.includes(member);
    if (existing) {
      this.pushNotification('error', 'Validación', 'El miembro ya se encuentra registrado en este grupo.');
      return;
    }

    this.membersByGroup[this.selectedGroupId] = [...this.groupMembers, member];
    this.syncGroupMetrics();
    this.newMember = '';
    this.persistMembers();
    this.persistGroups();
    this.pushNotification('success', 'Operación completada', 'El miembro se agregó al grupo correctamente.');
  }

  removeMember(member: string): void {
    this.notification = null;

    if (!this.canRemoveGroupMembers) {
      this.pushNotification('error', 'Permisos insuficientes', 'No cuentas con autorización para remover miembros del grupo.');
      return;
    }

    this.membersByGroup[this.selectedGroupId] = this.groupMembers.filter((item) => item !== member);
    this.syncGroupMetrics();
    this.persistMembers();
    this.persistGroups();
    this.pushNotification('success', 'Operación completada', 'El miembro se eliminó del grupo correctamente.');
  }

  private pushNotification(severity: 'success' | 'error', summary: string, detail: string): void {
    this.notification = { severity, text: `${summary}: ${detail}` };
  }

  private loadGroups(): void {
    const result = this.groupBoardData.loadGroups(this.selectedGroupId);
    this.groups = result.groups;
    this.selectedGroupId = result.selectedGroupId;

    if (result.restoredInvalid) {
      this.pushNotification('error', 'Integridad de datos', 'Se restauraron los grupos debido a datos inválidos en el almacenamiento local.');
    }
  }

  private persistGroups(): void { this.groupBoardData.persistGroups(this.groups); }

  private loadTickets(): void {
    const result = this.groupBoardData.loadTickets(this.selectedGroupId, this.currentUser.email);
    this.tickets = result.tickets;
    this.syncGroupMetrics();
  }

  private persistTickets(): void { this.groupBoardData.persistTickets(this.tickets); }

  private loadCurrentUser(): void {
    this.currentUser = this.authSession.getCurrentUser({
      email: 'admin@seguridadweb.com',
      displayName: 'Administrador'
    });
  }

  private loadMembers(): void {
    const result = this.groupBoardData.loadMembers();
    this.membersByGroup = result.membersByGroup;
    this.syncGroupMetrics();
  }

  private persistMembers(): void { this.groupBoardData.persistMembers(this.membersByGroup); }

  private loadPermissions(): void {
    const result = this.groupBoardData.loadPermissions();
    this.permissionsByGroup = result.permissionsByGroup;
  }

  private persistPermissions(): void { this.groupBoardData.persistPermissions(this.permissionsByGroup); }

  private syncGroupFromQueryParam(): void {
    this.route.queryParamMap.subscribe((params) => {
      const queryGroupId = Number(params.get('groupId'));
      if (Number.isFinite(queryGroupId) && this.groups.some((group) => group.id === queryGroupId)) {
        this.selectedGroupId = queryGroupId;
        this.groupNameForm = this.selectedGroupName;
      }

      if (params.get('createTicket') === '1') {
        this.openCreateDialog();
      }

      this.cdr.markForCheck();
    });
  }

  private syncGroupMetrics(): void {
    this.groups = this.groupBoardData.syncGroupMetrics(this.groups, this.tickets, this.membersByGroup);
  }

  private isTicketFormValid(): boolean {
    if (this.ticketForm.title.trim().length === 0) {
      return false;
    }

    const createdDate = toValidDate(this.ticketForm.createdAt);
    const dueDate = toValidDate(this.ticketForm.dueDate);

    if (!createdDate || !dueDate) {
      return false;
    }

    if (
      this.ticketForm.assignedTo.trim().length > 0 &&
      !this.groupMembers.includes(this.ticketForm.assignedTo.trim())
    ) {
      return false;
    }

    return dueDate.getTime() >= createdDate.getTime();
  }

  private sortTickets(left: TicketRecord, right: TicketRecord): number {
    return sortGroupTickets(left, right, this.filterSort);
  }

  private updateTicket(nextTicket: TicketRecord): void {
    this.tickets = this.groupTicketFacade.replaceTicket(this.tickets, nextTicket);
    this.syncGroupMetrics();
    this.persistTickets();
    this.persistGroups();
    this.selectedTicket = nextTicket;
    this.detailForm = createFormFromTicket(nextTicket);
  }

  private matchesQuickFilter(ticket: TicketRecord): boolean {
    return this.groupRules.matchesQuickFilter(
      ticket,
      this.quickFilter,
      this.currentUser.email,
      this.currentUser.displayName
    );
  }

  private hasGroupPermission(permission: GroupPermission): boolean {
    return this.groupRules.hasGroupPermission(
      permission,
      this.permissionsByGroup,
      this.selectedGroupId,
      this.currentUser.email
    );
  }

  permissionLabel(permission: GroupPermission): string {
    switch (permission) {
      case 'group:add':
        return 'Crear grupo';
      case 'group:view':
        return 'Ver grupo';
      case 'group:edit':
        return 'Editar grupo';
      case 'group:remove':
        return 'Eliminar grupo';
      case 'group:add:members':
        return 'Agregar miembros';
      case 'group:remove:members':
        return 'Remover miembros';
      default:
        return permission;
    }
  }

  permissionSeverity(permission: GroupPermission): 'success' | 'warn' | 'danger' {
    switch (permission) {
      case 'group:add':
      case 'group:view':
      case 'group:add:members':
        return 'success';
      case 'group:edit':
      case 'group:remove:members':
        return 'warn';
      case 'group:remove':
        return 'danger';
      default:
        return 'warn';
    }
  }

  statusSeverity(s: GroupStatus) { return STATUS_SEVERITY[s]; }
  prioritySeverity(p: GroupPriority) { return PRIORITY_SEVERITY[p]; }
}
