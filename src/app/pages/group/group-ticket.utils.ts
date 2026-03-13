import {
  FlexDate,
  GROUP_PRIORITIES,
  GROUP_STATUSES,
  GroupPriority,
  GroupStatus,
  PRIORITY_WEIGHTS,
  TicketFormModel,
  TicketRecord,
  TicketSort
} from './group.models';

export function sortGroupTickets(left: TicketRecord, right: TicketRecord, sortMode: TicketSort): number {
  const leftCreated = new Date(left.createdAt).getTime();
  const rightCreated = new Date(right.createdAt).getTime();
  const leftDue = new Date(left.dueDate).getTime();
  const rightDue = new Date(right.dueDate).getTime();

  switch (sortMode) {
    case 'createdAsc':
      return leftCreated - rightCreated;
    case 'dueAsc':
      return leftDue - rightDue;
    case 'dueDesc':
      return rightDue - leftDue;
    case 'priorityDesc':
      return PRIORITY_WEIGHTS[right.priority] - PRIORITY_WEIGHTS[left.priority];
    default:
      return rightCreated - leftCreated;
  }
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toValidDate(value: FlexDate): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(baseDate: Date, days: number): Date {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result;
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function createEmptyTicketForm(): TicketFormModel {
  return {
    title: '',
    description: '',
    status: 'Pendiente',
    assignedTo: '',
    priority: 'Media',
    createdAt: new Date(),
    dueDate: addDays(new Date(), 7)
  };
}

export function createFormFromTicket(ticket: TicketRecord): TicketFormModel {
  return {
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    assignedTo: ticket.assignedTo,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    dueDate: ticket.dueDate
  };
}

export function normalizeStatus(value: unknown): GroupStatus {
  return typeof value === 'string' && GROUP_STATUSES.includes(value as GroupStatus)
    ? (value as GroupStatus)
    : 'Pendiente';
}

export function normalizePriority(value: unknown): GroupPriority {
  return typeof value === 'string' && GROUP_PRIORITIES.includes(value as GroupPriority)
    ? (value as GroupPriority)
    : 'Media';
}

export function normalizeTicket(item: unknown, index: number, selectedGroupId: number, currentUserEmail: string): TicketRecord {
  const source = typeof item === 'object' && item !== null ? (item as Partial<TicketRecord>) : {};
  let createdBy = currentUserEmail;

  if (typeof source.assignedTo === 'string') {
    createdBy = source.assignedTo;
  }

  if (typeof source.createdBy === 'string') {
    createdBy = source.createdBy;
  }

  return {
    id: typeof source.id === 'number' ? source.id : index + 1,
    groupId: typeof source.groupId === 'number' ? source.groupId : selectedGroupId,
    title: typeof source.title === 'string' ? source.title : 'Ticket sin título',
    description: typeof source.description === 'string' ? source.description : '',
    createdBy,
    status: normalizeStatus(source.status),
    assignedTo: typeof source.assignedTo === 'string' ? source.assignedTo : '',
    priority: normalizePriority(source.priority),
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : formatIsoDate(new Date()),
    dueDate: typeof source.dueDate === 'string' ? source.dueDate : formatIsoDate(addDays(new Date(), 7)),
    comments: Array.isArray(source.comments) ? source.comments.map(String) : [],
    history: Array.isArray(source.history) ? source.history.map(String) : []
  };
}
