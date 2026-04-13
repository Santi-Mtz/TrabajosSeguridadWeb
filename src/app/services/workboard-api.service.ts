import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';

export type ApiGroupRecord = {
  id: number;
  name: string;
  description?: string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type ApiGroupWritePayload = {
  name: string;
  description?: string | null;
  created_by?: number;
};

export type ApiTicketRecord = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  group_id: number;
  assigned_to?: number | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type ApiTicketWritePayload = {
  title: string;
  description?: string | null;
  status?: string;
  group_id: number;
  assigned_to?: number | null;
  created_by?: number;
  updated_by?: number;
};

export type ApiTicketCommentRecord = {
  id: number;
  ticket_id: number;
  created_by?: number | null;
  comment: string;
  created_at?: string;
};

export type ApiTicketHistoryRecord = {
  id: number;
  ticket_id: number;
  actor_user_id?: number | null;
  event: string;
  created_at?: string;
};

export type ApiTicketActivityRecord = {
  comments: ApiTicketCommentRecord[];
  history: ApiTicketHistoryRecord[];
};

export type ApiGroupMemberRecord = {
  id: number;
  username: string;
  email: string;
  is_active?: boolean;
  joined_at?: string;
};

export type ApiUserRecord = {
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
};

export type ApiUserWritePayload = {
  username: string;
  email: string;
  full_name?: string;
  address?: string;
  phone?: string;
  birth_date?: string | null;
  role?: string;
  team?: string;
  is_active?: boolean;
  password?: string;
};

type ApiEnvelope<T> = {
  statusCode: number;
  intOpCode: string;
  message: string;
  data: T;
};

@Injectable({
  providedIn: 'root'
})
export class WorkboardApiService {
  private readonly userServiceUrl = `${environment.userServiceUrl}`;
  private readonly groupServiceUrl = `${environment.groupServiceUrl}`;
  private readonly ticketServiceUrl = `${environment.ticketServiceUrl}`;
  private readonly requestTimeoutMs = 10000;
  private readonly authTokenStorageKey = 'auth.token';

  constructor(private readonly storage: StorageService) {}

  async listUsers(): Promise<ApiUserRecord[]> {
    const response = await this.request<ApiUserRecord[]>(`${this.userServiceUrl}/users`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async createUser(payload: ApiUserWritePayload): Promise<ApiUserRecord> {
    const response = await this.request<ApiUserRecord>(`${this.userServiceUrl}/users`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.data) {
      throw new Error(response.message || 'No fue posible crear el usuario.');
    }

    return response.data;
  }

  async updateUser(userId: number, payload: ApiUserWritePayload): Promise<ApiUserRecord> {
    const response = await this.request<ApiUserRecord>(`${this.userServiceUrl}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!response.data) {
      throw new Error(response.message || 'No fue posible actualizar el usuario.');
    }

    return response.data;
  }

  async deleteUser(userId: number): Promise<void> {
    await this.request<null>(`${this.userServiceUrl}/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async setUserActive(userId: number, isActive: boolean): Promise<void> {
    await this.request<null>(`${this.userServiceUrl}/users/${userId}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive })
    });
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const response = await this.request<string[]>(`${this.userServiceUrl}/users/${userId}/permissions`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async setUserPermissions(userId: number, permissions: string[]): Promise<string[]> {
    const response = await this.request<string[]>(`${this.userServiceUrl}/users/${userId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions })
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async listGroups(): Promise<ApiGroupRecord[]> {
    const response = await this.request<ApiGroupRecord[]>(`${this.groupServiceUrl}/groups`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async listGroupMembers(groupId: number): Promise<ApiGroupMemberRecord[]> {
    const response = await this.request<ApiGroupMemberRecord[]>(`${this.groupServiceUrl}/groups/${groupId}/members`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async addGroupMember(groupId: number, email: string): Promise<ApiGroupMemberRecord> {
    const response = await this.request<ApiGroupMemberRecord>(`${this.groupServiceUrl}/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (!response.data) {
      throw new Error(response.message || 'No fue posible agregar el miembro.');
    }

    return response.data;
  }

  async removeGroupMember(groupId: number, email: string): Promise<void> {
    await this.request<null>(`${this.groupServiceUrl}/groups/${groupId}/members/${encodeURIComponent(email)}`, {
      method: 'DELETE'
    });
  }

  async listTickets(): Promise<ApiTicketRecord[]> {
    const response = await this.request<ApiTicketRecord[]>(`${this.ticketServiceUrl}/tickets`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async createGroup(payload: ApiGroupWritePayload): Promise<ApiGroupRecord> {
    const response = await this.request<ApiGroupRecord>(`${this.groupServiceUrl}/groups`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.data) {
      throw new Error(response.message || 'No fue posible crear el grupo.');
    }

    return response.data;
  }

  async updateGroup(groupId: number, payload: Partial<ApiGroupWritePayload>): Promise<ApiGroupRecord> {
    const response = await this.request<ApiGroupRecord>(`${this.groupServiceUrl}/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!response.data) {
      throw new Error(response.message || 'No fue posible actualizar el grupo.');
    }

    return response.data;
  }

  async deleteGroup(groupId: number): Promise<void> {
    await this.request<null>(`${this.groupServiceUrl}/groups/${groupId}`, {
      method: 'DELETE'
    });
  }

  async createTicket(payload: ApiTicketWritePayload): Promise<ApiTicketRecord> {
    const response = await this.request<ApiTicketRecord>(`${this.ticketServiceUrl}/tickets`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.data) {
      throw new Error(response.message || 'No fue posible crear el ticket.');
    }

    return response.data;
  }

  async updateTicket(ticketId: number, payload: Partial<ApiTicketWritePayload>): Promise<ApiTicketRecord> {
    const response = await this.request<ApiTicketRecord>(`${this.ticketServiceUrl}/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!response.data) {
      throw new Error(response.message || 'No fue posible actualizar el ticket.');
    }

    return response.data;
  }

  async deleteTicket(ticketId: number): Promise<void> {
    await this.request<null>(`${this.ticketServiceUrl}/tickets/${ticketId}`, {
      method: 'DELETE'
    });
  }

  async addTicketComment(ticketId: number, comment: string, createdBy?: number): Promise<ApiTicketCommentRecord> {
    const response = await this.request<ApiTicketCommentRecord>(`${this.ticketServiceUrl}/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        comment,
        created_by: createdBy
      })
    });

    if (!response.data) {
      throw new Error(response.message || 'No fue posible agregar el comentario.');
    }

    return response.data;
  }

  async getTicketActivity(ticketId: number): Promise<ApiTicketActivityRecord> {
    const response = await this.request<ApiTicketActivityRecord>(`${this.ticketServiceUrl}/tickets/${ticketId}/activity`);
    return {
      comments: Array.isArray(response.data?.comments) ? response.data.comments : [],
      history: Array.isArray(response.data?.history) ? response.data.history : []
    };
  }

  private async request<T>(url: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
    const headers = new Headers(init?.headers ?? undefined);
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const token = this.storage.getItem(this.authTokenStorageKey);
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (init?.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers,
        credentials: 'include',
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('La solicitud tardó demasiado en responder. Intenta nuevamente.');
      }

      throw new Error('No fue posible conectar con el servidor. Verifica que los servicios estén activos.');
    } finally {
      clearTimeout(timeoutId);
    }

    const payload = await response.json() as ApiEnvelope<T>;

    if (response.status === 401) {
      this.storage.removeItem(this.authTokenStorageKey);
    }

    if (!response.ok) {
      const message = typeof payload?.message === 'string' && payload.message.trim().length > 0
        ? payload.message
        : `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload;
  }
}