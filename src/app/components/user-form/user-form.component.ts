import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';

export type UserFormFields = {
  username: string;
  fullName: string;
  address: string;
  phone: string;
  birthDate: string | Date | null;
  email: string;
  role: string;
  team: string;
};

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, DatePickerModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css'
})
export class UserFormComponent {
  @Input({ required: true }) model!: UserFormFields;
  @Input() birthDateInputId?: string;
}
