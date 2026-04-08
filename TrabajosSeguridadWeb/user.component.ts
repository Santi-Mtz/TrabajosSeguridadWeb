import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: string;
  team: string;
};

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, InputTextModule, ButtonModule, MessageModule],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent implements OnInit {
  private readonly storageKey = 'crud.users';
  private readonly defaultUsers: UserRecord[] = [
    {
      id: 1,
      name: 'Santiago Martinez',
      email: 'santiago.martinez@example.com',
      role: 'Estudiante',
      team: 'Seguridad web'
    }
  ];

  notification: { severity: 'success' | 'error'; text: string } | null = null;

  users: UserRecord[] = [...this.defaultUsers];

  form = {
    id: 0,
    name: '',
    email: '',
    role: '',
    team: ''
  };

  editingId: number | null = null;

  ngOnInit(): void {
    this.loadUsers();
  }

  get isFormValid(): boolean {
    return (
      this.form.name.trim().length > 0 &&
      this.form.email.trim().length > 0 &&
      this.form.role.trim().length > 0 &&
      this.form.team.trim().length > 0
    );
  }

  saveUser(): void {
    this.notification = null;

    if (!this.isFormValid) {
      this.pushNotification('error', 'Error', 'Completa todos los campos del usuario.');
      return;
    }

    if (this.editingId !== null) {
      this.users = this.users.map((user) =>
        user.id === this.editingId
          ? {
              ...user,
              name: this.form.name.trim(),
              email: this.form.email.trim(),
              role: this.form.role.trim(),
              team: this.form.team.trim()
            }
          : user
      );
          this.persistUsers();
      this.pushNotification('success', 'Actualizado', 'Usuario actualizado correctamente.');
      this.resetForm();
      return;
    }

    const nextId = this.users.length ? Math.max(...this.users.map((user) => user.id)) + 1 : 1;

    this.users = [
      ...this.users,
      {
        id: nextId,
        name: this.form.name.trim(),
        email: this.form.email.trim(),
        role: this.form.role.trim(),
        team: this.form.team.trim()
      }
    ];
    this.persistUsers();

    this.pushNotification('success', 'Creado', 'Usuario creado correctamente.');
    this.resetForm();
  }

  editUser(user: UserRecord): void {
    this.notification = null;
    this.editingId = user.id;
    this.form = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team: user.team
    };
  }

  deleteUser(id: number): void {
    this.notification = null;
    const exists = this.users.some((user) => user.id === id);

    if (!exists) {
      this.pushNotification('error', 'Error', 'No se encontró el usuario a eliminar.');
      return;
    }

    this.users = this.users.filter((user) => user.id !== id);
    this.persistUsers();

    if (this.editingId === id) {
      this.resetForm();
    }

    this.pushNotification('success', 'Eliminado', 'Usuario eliminado correctamente.');
  }

  resetForm(): void {
    this.editingId = null;
    this.form = {
      id: 0,
      name: '',
      email: '',
      role: '',
      team: ''
    };
  }

  private pushNotification(severity: 'success' | 'error', summary: string, detail: string): void {
    this.notification = { severity, text: `${summary}: ${detail}` };
  }

  private loadUsers(): void {
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

      this.users = parsed as UserRecord[];
    } catch {
      this.users = [...this.defaultUsers];
      this.persistUsers();
      this.pushNotification('error', 'Error', 'Se restauraron usuarios por datos inválidos en almacenamiento local.');
    }
  }

  private persistUsers(): void {
    if (!('localStorage' in globalThis)) {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(this.users));
  }
}
