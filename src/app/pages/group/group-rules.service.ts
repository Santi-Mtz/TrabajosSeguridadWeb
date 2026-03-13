import { Injectable } from '@angular/core';
import { HIGH_PRIORITY_VALUES, GroupPermission, GroupPermissionsMap, GroupStatus, QuickFilter, TicketRecord } from './group.models';

@Injectable({
  providedIn: 'root'
})
export class GroupRulesService {
  normalizeIdentity(value: string): string {
    return value.trim().toLowerCase();
  }

  matchesCurrentUser(ticket: TicketRecord, field: 'createdBy' | 'assignedTo', currentEmail: string, currentDisplayName: string): boolean {
    const fieldValue = this.normalizeIdentity(ticket[field]);
    return fieldValue === this.normalizeIdentity(currentEmail)
      || fieldValue === this.normalizeIdentity(currentDisplayName);
  }

  isTicketCreator(ticket: TicketRecord, currentEmail: string, currentDisplayName: string): boolean {
    return this.matchesCurrentUser(ticket, 'createdBy', currentEmail, currentDisplayName);
  }

  isTicketAssignee(ticket: TicketRecord, currentEmail: string, currentDisplayName: string): boolean {
    return this.matchesCurrentUser(ticket, 'assignedTo', currentEmail, currentDisplayName);
  }

  canChangeTicketStatus(ticket: TicketRecord, currentEmail: string, currentDisplayName: string): boolean {
    return this.isTicketCreator(ticket, currentEmail, currentDisplayName)
      || this.isTicketAssignee(ticket, currentEmail, currentDisplayName);
  }

  matchesQuickFilter(ticket: TicketRecord, quickFilter: QuickFilter, currentEmail: string, currentDisplayName: string): boolean {
    if (quickFilter === 'all') {
      return true;
    }

    if (quickFilter === 'mine') {
      return this.isTicketAssignee(ticket, currentEmail, currentDisplayName);
    }

    if (quickFilter === 'unassigned') {
      return ticket.assignedTo.trim().length === 0;
    }

    return HIGH_PRIORITY_VALUES.includes(ticket.priority);
  }

  hasGroupPermission(
    permission: GroupPermission,
    permissionsByGroup: GroupPermissionsMap,
    selectedGroupId: number,
    currentEmail: string
  ): boolean {
    const currentIdentity = this.normalizeIdentity(currentEmail);
    const currentGroupPermissions = permissionsByGroup[selectedGroupId]?.[permission] ?? [];
    return currentGroupPermissions.some((entry) => this.normalizeIdentity(entry) === currentIdentity);
  }

  selectedTicketPermissionText(
    ticket: TicketRecord | null,
    canEditSelectedTicket: boolean,
    canChangeSelectedTicketStatus: boolean
  ): string {
    if (!ticket) {
      return '';
    }

    if (canEditSelectedTicket) {
      return 'Puedes editar todos los campos, reasignar y agregar comentarios.';
    }

    if (canChangeSelectedTicketStatus) {
      return 'Puedes cambiar el estado y agregar comentarios.';
    }

    return 'Solo tienes acceso de lectura a este ticket.';
  }

  statusColumnId(status: GroupStatus): string {
    return 'kanban-col-' + status.replaceAll(' ', '-');
  }
}
