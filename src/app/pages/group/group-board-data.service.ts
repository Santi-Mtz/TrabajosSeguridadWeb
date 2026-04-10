import { Injectable } from '@angular/core';
import { GroupPermissionsMap, GroupRecord, TicketRecord } from './group.models';

@Injectable({
  providedIn: 'root'
})
export class GroupBoardDataService {
  private readonly defaultGroups: GroupRecord[] = [
    {
      id: 1,
      name: 'Blue Team',
      category: 'Security',
      level: 'Intermediate',
      author: 'Santiago Martinez',
      members: 5,
      tickets: 12
    },
    {
      id: 2,
      name: 'Red Team',
      category: 'Security',
      level: 'Advanced',
      author: 'Ana Gómez',
      members: 4,
      tickets: 8
    }
  ];

  private readonly defaultTickets: TicketRecord[] = [
    {
      id: 1,
      groupId: 1,
      title: 'Configurar CSP',
      description: 'Definir política CSP base para frontend.',
      createdBy: 'santiago.martinez@example.com',
      status: 'Pendiente',
      assignedTo: 'santiago.martinez@example.com',
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
      createdBy: 'ana.gomez@example.com',
      status: 'En progreso',
      assignedTo: 'ana.gomez@example.com',
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
      createdBy: 'luis.perez@example.com',
      status: 'Bloqueado',
      assignedTo: 'luis.perez@example.com',
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
      createdBy: 'maria.ruiz@example.com',
      status: 'Hecho',
      assignedTo: 'maria.ruiz@example.com',
      priority: 'Media',
      createdAt: '2026-03-04',
      dueDate: '2026-03-12',
      comments: ['Corregido y validado'],
      history: ['Ticket creado', 'Estado cambiado a Hecho']
    }
  ];

  private readonly defaultMembersByGroup: Record<number, string[]> = {
    1: ['santiago.martinez@example.com', 'ana.gomez@example.com'],
    2: ['luis.perez@example.com', 'maria.ruiz@example.com']
  };

  private readonly defaultPermissionsByGroup: GroupPermissionsMap = {
    1: {
      'group:add': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'santiago.martinez@example.com'],
      'group:view': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'santiago.martinez@example.com'],
      'group:edit': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'santiago.martinez@example.com'],
      'group:remove': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'santiago.martinez@example.com'],
      'group:add:members': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'santiago.martinez@example.com'],
      'group:remove:members': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'santiago.martinez@example.com']
    },
    2: {
      'group:add': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'ana.gomez@example.com'],
      'group:view': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'ana.gomez@example.com'],
      'group:edit': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'ana.gomez@example.com'],
      'group:remove': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'ana.gomez@example.com'],
      'group:add:members': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'ana.gomez@example.com'],
      'group:remove:members': ['superadmin@seguridadweb.com', 'admin@seguridadweb.com', 'ana.gomez@example.com']
    }
  };

  createInitialState(): {
    groups: GroupRecord[];
    tickets: TicketRecord[];
    membersByGroup: Record<number, string[]>;
    permissionsByGroup: GroupPermissionsMap;
  } {
    return {
      groups: this.cloneGroups(this.defaultGroups),
      tickets: this.cloneTickets(this.defaultTickets),
      membersByGroup: this.cloneMembers(this.defaultMembersByGroup),
      permissionsByGroup: this.clonePermissions(this.defaultPermissionsByGroup)
    };
  }

  syncGroupMetrics(groups: GroupRecord[], tickets: TicketRecord[], membersByGroup: Record<number, string[]>): GroupRecord[] {
    return groups.map((group) => {
      const members = membersByGroup[group.id]?.length ?? 0;
      const totalTickets = tickets.filter((ticket) => ticket.groupId === group.id).length;
      return { ...group, members, tickets: totalTickets };
    });
  }

  private cloneGroups(groups: GroupRecord[]): GroupRecord[] {
    return groups.map((group) => ({ ...group }));
  }

  private cloneTickets(tickets: TicketRecord[]): TicketRecord[] {
    return tickets.map((ticket) => ({
      ...ticket,
      comments: [...ticket.comments],
      history: [...ticket.history]
    }));
  }

  private cloneMembers(source: Record<number, string[]>): Record<number, string[]> {
    return Object.fromEntries(
      Object.entries(source).map(([groupId, members]) => [Number(groupId), [...members]])
    ) as Record<number, string[]>;
  }

  private clonePermissions(source: GroupPermissionsMap): GroupPermissionsMap {
    return Object.fromEntries(
      Object.entries(source).map(([groupId, permissions]) => [
        Number(groupId),
        Object.fromEntries(
          Object.entries(permissions).map(([permission, members]) => [permission, [...members]])
        )
      ])
    ) as GroupPermissionsMap;
  }
}
