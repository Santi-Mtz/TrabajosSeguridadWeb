import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

type GroupRecord = {
  id: number;
  name: string;
  category: string;
  level: string;
  author: string;
  members: number;
  tickets: number;
};

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, InputTextModule, ButtonModule, MessageModule],
  templateUrl: './group.component.html',
  styleUrl: './group.component.css'
})
export class GroupComponent implements OnInit {
  private readonly storageKey = 'crud.groups';
  private readonly defaultGroups: GroupRecord[] = [
    {
      id: 1,
      name: 'Blue Team',
      category: 'Security',
      level: 'Intermediate',
      author: 'Santiago Martinez',
      members: 5,
      tickets: 12
    }
  ];

  notification: { severity: 'success' | 'error'; text: string } | null = null;

  groups: GroupRecord[] = [...this.defaultGroups];

  form = {
    id: 0,
    name: '',
    category: '',
    level: '',
    author: '',
    members: '',
    tickets: ''
  };

  editingId: number | null = null;

  ngOnInit(): void {
    this.loadGroups();
  }

  get total(): number {
    return this.groups.length;
  }

  get isFormValid(): boolean {
    const members = Number(this.form.members);
    const tickets = Number(this.form.tickets);

    return (
      this.form.name.trim().length > 0 &&
      this.form.category.trim().length > 0 &&
      this.form.level.trim().length > 0 &&
      this.form.author.trim().length > 0 &&
      Number.isFinite(members) &&
      Number.isFinite(tickets) &&
      members >= 0 &&
      tickets >= 0
    );
  }

  saveGroup(): void {
    this.notification = null;

    if (!this.isFormValid) {
      this.pushNotification('error', 'Error', 'Completa correctamente todos los campos del grupo.');
      return;
    }

    const groupPayload: Omit<GroupRecord, 'id'> = {
      name: this.form.name.trim(),
      category: this.form.category.trim(),
      level: this.form.level.trim(),
      author: this.form.author.trim(),
      members: Number(this.form.members),
      tickets: Number(this.form.tickets)
    };

    if (this.editingId !== null) {
      this.groups = this.groups.map((group) =>
        group.id === this.editingId
          ? {
              id: group.id,
              ...groupPayload
            }
          : group
      );
          this.persistGroups();

      this.pushNotification('success', 'Actualizado', 'Grupo actualizado correctamente.');
      this.resetForm();
      return;
    }

    const nextId = this.groups.length ? Math.max(...this.groups.map((group) => group.id)) + 1 : 1;

    this.groups = [
      ...this.groups,
      {
        id: nextId,
        ...groupPayload
      }
    ];
    this.persistGroups();

    this.pushNotification('success', 'Creado', 'Grupo creado correctamente.');
    this.resetForm();
  }

  editGroup(group: GroupRecord): void {
    this.notification = null;
    this.editingId = group.id;
    this.form = {
      id: group.id,
      name: group.name,
      category: group.category,
      level: group.level,
      author: group.author,
      members: String(group.members),
      tickets: String(group.tickets)
    };
  }

  deleteGroup(id: number): void {
    this.notification = null;
    const exists = this.groups.some((group) => group.id === id);

    if (!exists) {
      this.pushNotification('error', 'Error', 'No se encontró el grupo a eliminar.');
      return;
    }

    this.groups = this.groups.filter((group) => group.id !== id);
    this.persistGroups();

    if (this.editingId === id) {
      this.resetForm();
    }

    this.pushNotification('success', 'Eliminado', 'Grupo eliminado correctamente.');
  }

  resetForm(): void {
    this.editingId = null;
    this.form = {
      id: 0,
      name: '',
      category: '',
      level: '',
      author: '',
      members: '',
      tickets: ''
    };
  }

  private pushNotification(severity: 'success' | 'error', summary: string, detail: string): void {
    this.notification = { severity, text: `${summary}: ${detail}` };
  }

  private loadGroups(): void {
    if (!('localStorage' in globalThis)) {
      return;
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new TypeError('Formato inválido');
      }

      this.groups = parsed as GroupRecord[];
    } catch {
      this.groups = [...this.defaultGroups];
      this.persistGroups();
      this.pushNotification('error', 'Error', 'Se restauraron grupos por datos inválidos en almacenamiento local.');
    }
  }

  private persistGroups(): void {
    if (!('localStorage' in globalThis)) {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(this.groups));
  }
}
