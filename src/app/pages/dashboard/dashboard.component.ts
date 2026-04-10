import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AuthSessionService, AuthSessionUser } from '../../services/auth-session.service';
import { AuthorizationService } from '../../services/authorization.service';
import { StorageService } from '../../services/storage.service';
import { WorkboardApiService } from '../../services/workboard-api.service';

type TicketStatus = 'Pendiente' | 'En progreso' | 'Revisión' | 'Bloqueado' | 'Hecho';

type TicketRecord = {
  id: number;
  groupId: number;
  title: string;
  description: string;
  status: TicketStatus;
  assignedTo: string;
  priority: 'Baja' | 'Media' | 'Alta';
  createdAt: string;
  dueDate: string;
  comments: string[];
  history: string[];
};

type GroupOption = {
  id: number;
  name: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CardModule, ButtonModule, SelectModule, TableModule, TagModule, TooltipModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly storage: StorageService,
    private readonly authSession: AuthSessionService,
    private readonly authorization: AuthorizationService,
    private readonly workboardApi: WorkboardApiService
  ) {}

  private readonly ticketsStorageKey = 'board.tickets';
  private readonly groupsStorageKey = 'crud.groups';

  readonly statuses: TicketStatus[] = ['Pendiente', 'En progreso', 'Revisión', 'Bloqueado', 'Hecho'];

  readonly defaultGroups: GroupOption[] = [
    { id: 1, name: 'Blue Team' },
    { id: 2, name: 'Red Team' }
  ];

  readonly defaultTickets: TicketRecord[] = [
    {
      id: 1,
      groupId: 1,
      title: 'Configurar CSP',
      description: 'Definir política CSP base para frontend.',
      status: 'Pendiente',
      assignedTo: 'Santiago Martinez',
      priority: 'Alta',
      createdAt: '2026-03-01',
      dueDate: '2026-03-15',
      comments: ['Pendiente de revisión técnica'],
      history: ['Ticket creado']
    },
    {
      id: 2,
      groupId: 1,
      title: 'Validar headers',
      description: 'Revisar X-Frame-Options y HSTS.',
      status: 'En progreso',
      assignedTo: 'Ana Gómez',
      priority: 'Media',
      createdAt: '2026-03-02',
      dueDate: '2026-03-16',
      comments: ['Recolección de evidencia iniciada'],
      history: ['Ticket creado', 'Estado cambiado a En progreso']
    },
    {
      id: 3,
      groupId: 2,
      title: 'Checklist OWASP',
      description: 'Completar checklist de seguridad para login.',
      status: 'Bloqueado',
      assignedTo: 'Luis Pérez',
      priority: 'Alta',
      createdAt: '2026-03-03',
      dueDate: '2026-03-20',
      comments: ['Esperando aprobación final'],
      history: ['Ticket creado', 'Estado cambiado a Bloqueado']
    },
    {
      id: 4,
      groupId: 2,
      title: 'Corregir sanitización',
      description: 'Ajustar sanitización de inputs en registro.',
      status: 'Hecho',
      assignedTo: 'María Ruiz',
      priority: 'Media',
      createdAt: '2026-03-04',
      dueDate: '2026-03-12',
      comments: ['Corregido y validado'],
      history: ['Ticket creado', 'Estado cambiado a Hecho']
    }
  ];

  groups: GroupOption[] = [...this.defaultGroups];
  tickets: TicketRecord[] = [...this.defaultTickets];
  selectedGroupId: number | null = null;
  currentUser: AuthSessionUser = { email: 'admin@seguridadweb.com', displayName: 'Administrador' };

  llmModel = 'gpt-4o';
  readonly llmOptions = [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus' },
    { label: 'Gemini 1.5 Pro', value: 'gemini-1-5-pro' },
    { label: 'Llama 3.1 70B', value: 'llama-3-1-70b' }
  ];

  ngOnInit(): void {
    this.loadCurrentUser();
    void this.loadGroups();
    void this.loadTickets();
  }

  get totalTickets(): number {
    return this.tickets.length;
  }

  get groupSelectOptions(): Array<{ label: string; value: number }> {
    return this.groups.map((group) => ({ label: group.name, value: group.id }));
  }

  ticketsForGroup(groupId: number): TicketRecord[] {
    return this.tickets.filter((t) => t.groupId === groupId);
  }

  ticketCountByStatus(groupId: number, status: TicketStatus): number {
    return this.tickets.filter((t) => t.groupId === groupId && t.status === status).length;
  }

  get statusSummary(): Array<{ status: TicketStatus; total: number }> {
    return this.statuses.map((status) => ({
      status,
      total: this.tickets.filter((ticket) => ticket.status === status).length
    }));
  }

  get selectedGroupName(): string {
    if (this.selectedGroupId === null) {
      return 'Sin grupo';
    }

    return this.groups.find((group) => group.id === this.selectedGroupId)?.name ?? 'Grupo';
  }

  get canAccessGroup(): boolean {
    return this.authorization.canAccessGroupSection();
  }

  get canCreateTickets(): boolean {
    return this.authorization.canCreateTickets();
  }

  get recentTicketsForSelectedGroup(): TicketRecord[] {
    if (this.selectedGroupId === null) {
      return [];
    }

    return this.tickets
      .filter((ticket) => ticket.groupId === this.selectedGroupId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5);
  }

  get myTicketsForSelectedGroup(): TicketRecord[] {
    if (this.selectedGroupId === null) {
      return [];
    }

    const identity = this.currentUser.email.trim().toLowerCase();
    const displayName = this.currentUser.displayName.trim().toLowerCase();

    return this.tickets
      .filter((ticket) => {
        if (ticket.groupId !== this.selectedGroupId) {
          return false;
        }

        const assigned = ticket.assignedTo.trim().toLowerCase();
        return assigned === identity || assigned === displayName;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5);
  }

  goToGroupView(groupId?: number): void {
    if (!this.canAccessGroup) {
      return;
    }

    const id = groupId ?? this.selectedGroupId;
    if (id === null || id === undefined) {
      return;
    }

    void this.router.navigate(['/group'], { queryParams: { groupId: id } });
  }

  openCreateTicket(groupId: number): void {
    if (!this.canAccessGroup || !this.canCreateTickets) {
      return;
    }

    void this.router.navigate(['/group'], { queryParams: { groupId, createTicket: 1 } });
  }

  statusSeverity(status: TicketStatus): 'info' | 'warn' | 'success' | 'secondary' {
    switch (status) {
      case 'Pendiente':
        return 'warn';
      case 'En progreso':
      case 'Revisión':
        return 'info';
      case 'Bloqueado':
        return 'secondary';
      default:
        return 'success';
    }
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authSession.getCurrentUser({
      email: 'admin@seguridadweb.com',
      displayName: 'Administrador'
    });
  }

  private async loadGroups(): Promise<void> {
    try {
      const apiGroups = await this.workboardApi.listGroups();
      this.groups = apiGroups
        .filter((group) => typeof group.id === 'number' && typeof group.name === 'string')
        .map((group) => ({ id: group.id, name: group.name }))
        .sort((left, right) => left.id - right.id);

      if (this.groups.length === 0) {
        this.groups = [...this.defaultGroups];
      }

      this.selectedGroupId = this.groups[0]?.id ?? null;
      this.persistGroups(this.groups);
      this.cdr.markForCheck();
    } catch {
      this.groups = [...this.defaultGroups];
      this.selectedGroupId = this.groups[0]?.id ?? null;
      this.persistGroups(this.groups);
    }
  }

  private async loadTickets(): Promise<void> {
    try {
      const currentUser = this.authSession.getCurrentUserOrNull();
      const apiTickets = await this.workboardApi.listTickets();
      const createdAt = new Date().toISOString().slice(0, 10);

      this.tickets = apiTickets
        .filter((ticket) => typeof ticket.id === 'number' && typeof ticket.title === 'string' && typeof ticket.group_id === 'number')
        .map((ticket, index) => ({
          id: ticket.id,
          groupId: ticket.group_id,
          title: ticket.title,
          description: ticket.description ?? '',
          status: this.normalizeStatus(ticket.status),
          assignedTo: this.normalizeAssignedTo(ticket.assigned_to, currentUser?.id ?? null),
          priority: 'Media',
          createdAt: ticket.created_at?.slice(0, 10) ?? createdAt,
          dueDate: ticket.updated_at?.slice(0, 10) ?? createdAt,
          comments: [],
          history: [
            `Sincronizado desde backend (${index + 1})`
          ]
        }));

      if (this.tickets.length === 0) {
        this.tickets = [...this.defaultTickets];
      }

      this.persistTickets(this.tickets);
      this.cdr.markForCheck();
    } catch {
      this.tickets = [...this.defaultTickets];
      this.persistTickets(this.tickets);
    }
  }

  private normalizeStatus(status: string): TicketStatus {
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

  private normalizeAssignedTo(assignedTo: number | null | undefined, currentUserId: number | null): string {
    if (assignedTo === null || assignedTo === undefined) {
      return '';
    }

    if (currentUserId !== null && assignedTo === currentUserId) {
      return this.currentUser.displayName || this.currentUser.email;
    }

    return `Usuario #${assignedTo}`;
  }

  private persistTickets(tickets: TicketRecord[]): void {
    this.storage.setJson(this.ticketsStorageKey, tickets);
  }

  private persistGroups(groups: GroupOption[]): void {
    this.storage.setJson(this.groupsStorageKey, groups);
  }
}
