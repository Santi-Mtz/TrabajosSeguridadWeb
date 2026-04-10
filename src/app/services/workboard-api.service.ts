import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

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
};

export type ApiGroupMemberRecord = {
  id: number;
  username: string;
  email: string;
  is_active?: boolean;
  joined_at?: string;
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
  private readonly groupServiceUrl = `${environment.groupServiceUrl}`;
  private readonly ticketServiceUrl = `${environment.ticketServiceUrl}`;

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

  private async request<T>(url: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
    const headers = new Headers(init?.headers ?? undefined);
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (init?.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...init,
      headers
    });

    const payload = await response.json() as ApiEnvelope<T>;

    if (!response.ok) {
      const message = typeof payload?.message === 'string' && payload.message.trim().length > 0
        ? payload.message
        : `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload;
  }
}