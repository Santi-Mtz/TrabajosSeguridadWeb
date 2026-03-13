import { Injectable } from '@angular/core';
import { TicketFormModel, TicketRecord } from './group.models';
import { formatIsoDate, toValidDate } from './group-ticket.utils';

@Injectable({
  providedIn: 'root'
})
export class GroupTicketFacadeService {
  createTicket(
    tickets: TicketRecord[],
    form: TicketFormModel,
    selectedGroupId: number,
    currentUserEmail: string,
    currentUserDisplayName: string
  ): { ticket?: TicketRecord; error?: string } {
    const createdDate = toValidDate(form.createdAt);
    const dueDate = toValidDate(form.dueDate);

    if (!createdDate || !dueDate) {
      return { error: 'Selecciona fechas válidas para el ticket.' };
    }

    const nextId = tickets.length ? Math.max(...tickets.map((ticket) => ticket.id)) + 1 : 1;
    const createdAtIso = formatIsoDate(createdDate);
    const dueDateIso = formatIsoDate(dueDate);

    return {
      ticket: {
        id: nextId,
        groupId: selectedGroupId,
        title: form.title.trim(),
        description: form.description.trim(),
        createdBy: currentUserEmail,
        status: form.status,
        assignedTo: form.assignedTo.trim(),
        priority: form.priority,
        createdAt: createdAtIso,
        dueDate: dueDateIso,
        comments: [],
        history: [
          `Ticket creado por ${currentUserDisplayName} (${new Date().toLocaleString()})`,
          `Estado inicial: ${form.status}`
        ]
      }
    };
  }

  validateEditableDetailForm(detailForm: TicketFormModel): string | null {
    const title = detailForm.title.trim();
    const description = detailForm.description.trim();
    const assignedTo = detailForm.assignedTo.trim();
    const createdDate = toValidDate(detailForm.createdAt);
    const dueDate = toValidDate(detailForm.dueDate);

    if (!title || !description || !assignedTo || !createdDate || !dueDate) {
      return 'Completa correctamente todos los campos editables del ticket.';
    }

    if (dueDate.getTime() < createdDate.getTime()) {
      return 'La fecha límite no puede ser anterior a la fecha de creación.';
    }

    return null;
  }

  applyEditableDetailChanges(
    original: TicketRecord,
    detailForm: TicketFormModel,
    currentUserDisplayName: string
  ): { ticket: TicketRecord; history: string[] } {
    const nextTicket: TicketRecord = { ...original };
    const history: string[] = [];
    const title = detailForm.title.trim();
    const description = detailForm.description.trim();
    const assignedTo = detailForm.assignedTo.trim();
    const createdDate = toValidDate(detailForm.createdAt);
    const dueDate = toValidDate(detailForm.dueDate);

    if (!createdDate || !dueDate) {
      return { ticket: nextTicket, history };
    }

    const createdAtIso = formatIsoDate(createdDate);
    const dueDateIso = formatIsoDate(dueDate);

    if (title !== original.title) {
      nextTicket.title = title;
      history.push(`${currentUserDisplayName} actualizó el título`);
    }

    if (description !== original.description) {
      nextTicket.description = description;
      history.push(`${currentUserDisplayName} actualizó la descripción`);
    }

    if (assignedTo !== original.assignedTo) {
      nextTicket.assignedTo = assignedTo;
      history.push(`${currentUserDisplayName} reasignó el ticket a ${assignedTo}`);
    }

    if (detailForm.priority !== original.priority) {
      nextTicket.priority = detailForm.priority;
      history.push(`${currentUserDisplayName} cambió la prioridad a ${detailForm.priority}`);
    }

    if (createdAtIso !== original.createdAt) {
      nextTicket.createdAt = createdAtIso;
      history.push(`${currentUserDisplayName} cambió la fecha de creación a ${createdAtIso}`);
    }

    if (dueDateIso !== original.dueDate) {
      nextTicket.dueDate = dueDateIso;
      history.push(`${currentUserDisplayName} cambió la fecha límite a ${dueDateIso}`);
    }

    return { ticket: nextTicket, history };
  }

  replaceTicket(tickets: TicketRecord[], nextTicket: TicketRecord): TicketRecord[] {
    return tickets.map((ticket) => (ticket.id === nextTicket.id ? nextTicket : ticket));
  }

  appendComment(
    tickets: TicketRecord[],
    selectedTicketId: number,
    comment: string,
    currentUserDisplayName: string
  ): { tickets: TicketRecord[]; selectedTicket: TicketRecord | null } {
    const timestamp = new Date().toLocaleString();
    const nextTickets = tickets.map((ticket) => {
      if (ticket.id !== selectedTicketId) {
        return ticket;
      }

      return {
        ...ticket,
        comments: [...ticket.comments, `${currentUserDisplayName} (${timestamp}): ${comment}`],
        history: [...ticket.history, `${currentUserDisplayName} agregó un comentario (${timestamp})`]
      };
    });

    return {
      tickets: nextTickets,
      selectedTicket: nextTickets.find((ticket) => ticket.id === selectedTicketId) ?? null
    };
  }
}
