export type GroupStatus = 'Pendiente' | 'En progreso' | 'Revisión' | 'Bloqueado' | 'Hecho';
export type GroupPriority = 'Muy baja' | 'Baja' | 'Media-baja' | 'Media' | 'Media-alta' | 'Alta' | 'Urgente';
export type GroupPermission = 'group:add' | 'group:edit' | 'group:delete';
export type QuickFilter = 'all' | 'mine' | 'unassigned' | 'high';
export type TicketSort = 'createdAsc' | 'createdDesc' | 'dueAsc' | 'dueDesc' | 'priorityDesc';
export type FlexDate = Date | string | null;

export type TicketFormModel = {
  title: string;
  description: string;
  status: GroupStatus;
  assignedTo: string;
  priority: GroupPriority;
  createdAt: FlexDate;
  dueDate: FlexDate;
};

export type GroupRecord = {
  id: number;
  name: string;
  category: string;
  level: string;
  author: string;
  members: number;
  tickets: number;
};

export type GroupPermissionsMap = Record<number, Record<GroupPermission, string[]>>;

export type TicketRecord = {
  id: number;
  groupId: number;
  title: string;
  description: string;
  createdBy: string;
  status: GroupStatus;
  assignedTo: string;
  priority: GroupPriority;
  createdAt: string;
  dueDate: string;
  comments: string[];
  history: string[];
};

export const GROUP_STATUSES: GroupStatus[] = ['Pendiente', 'En progreso', 'Revisión', 'Bloqueado', 'Hecho'];
export const GROUP_PRIORITIES: GroupPriority[] = ['Muy baja', 'Baja', 'Media-baja', 'Media', 'Media-alta', 'Alta', 'Urgente'];
export const GROUP_PERMISSION_KEYS: GroupPermission[] = ['group:add', 'group:edit', 'group:delete'];
export const HIGH_PRIORITY_VALUES: GroupPriority[] = ['Media-alta', 'Alta', 'Urgente'];

export const QUICK_FILTER_OPTIONS: Array<{ label: string; value: QuickFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Mis tickets', value: 'mine' },
  { label: 'Sin asignar', value: 'unassigned' },
  { label: 'Prioridad alta', value: 'high' }
];

export const STATUS_SEVERITY: Record<GroupStatus, 'warn' | 'info' | 'secondary' | 'success'> = {
  Pendiente: 'warn',
  'En progreso': 'info',
  Revisión: 'info',
  Bloqueado: 'secondary',
  Hecho: 'success'
};

export const PRIORITY_SEVERITY: Record<GroupPriority, 'danger' | 'warn' | 'secondary' | 'info' | 'success'> = {
  Urgente: 'danger',
  Alta: 'warn',
  'Media-alta': 'warn',
  Media: 'secondary',
  'Media-baja': 'info',
  Baja: 'info',
  'Muy baja': 'success'
};

export const PRIORITY_WEIGHTS: Record<GroupPriority, number> = {
  Urgente: 7,
  Alta: 6,
  'Media-alta': 5,
  Media: 4,
  'Media-baja': 3,
  Baja: 2,
  'Muy baja': 1
};
