import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { ValidationService } from '../../services/validation.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    DatePickerModule,
    MessageModule,
    AuthShellComponent
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  constructor(private readonly validation: ValidationService) {}

  username = '';
  fullName = '';
  address = '';
  phone = '';
  birthDate: Date | string | null = null;
  email = '';
  password = '';
  confirmPassword = '';

  submitAttempted = false;
  successMessage = '';

  readonly specialSymbolDescription = '! @ # $ % ^ & * ( ) _ + - = { } ; : , . ?';

  get hasValidEmail(): boolean {
    return this.validation.isValidEmail(this.email);
  }

  get hasValidPhone(): boolean {
    return this.validation.isValidPhone(this.phone);
  }

  get hasStrongPassword(): boolean {
    return this.validation.hasStrongPassword(this.password);
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  get isAdult(): boolean {
    const birthDate = this.birthDateValue;
    if (!birthDate) {
      return false;
    }

    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 18;
  }

  get hasRequiredFields(): boolean {
    return (
      this.username.trim().length > 0 &&
      this.fullName.trim().length > 0 &&
      this.address.trim().length > 0 &&
      this.birthDateValue.length > 0 &&
      this.email.trim().length > 0 &&
      this.phone.trim().length > 0 &&
      this.password.trim().length > 0 &&
      this.confirmPassword.trim().length > 0
    );
  }

  get birthDateValue(): string {
    if (typeof this.birthDate === 'string') {
      return this.birthDate.length >= 10 ? this.birthDate.slice(0, 10) : '';
    }

    if (this.birthDate instanceof Date && !Number.isNaN(this.birthDate.getTime())) {
      return this.birthDate.toISOString().slice(0, 10);
    }

    return '';
  }

  get isFormValid(): boolean {
    return (
      this.hasRequiredFields &&
      this.hasValidEmail &&
      this.hasValidPhone &&
      this.hasStrongPassword &&
      this.passwordsMatch &&
      this.isAdult
    );
  }

  onRegister(): void {
    this.submitAttempted = true;
    this.successMessage = '';

    if (!this.isFormValid) {
      return;
    }

    this.successMessage = 'Registro completado correctamente.';
  }
}
