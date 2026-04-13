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
import { environment } from '../../../environments/environment';

type RegisterApiResponse = {
  statusCode: number;
  intOpCode: string;
  message: string;
  data: unknown;
};

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
  constructor(
    private readonly validation: ValidationService
  ) {}

  private readonly gatewayRegisterUrl = `${environment.apiGatewayUrl}/auth/register`;

  username = '';
  fullName = '';
  address = '';
  phone = '';
  birthDate: Date | string | null = null;
  email = '';
  password = '';
  confirmPassword = '';

  submitAttempted = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

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

  async onRegister(): Promise<void> {
    this.submitAttempted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.isFormValid) {
      return;
    }

    this.isSubmitting = true;
    try {
      const response = await fetch(this.gatewayRegisterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
        username: this.username.trim(),
        email: this.email.trim().toLowerCase(),
        full_name: this.fullName.trim(),
        address: this.address.trim(),
        phone: this.phone.trim(),
        birth_date: this.birthDateValue,
        password: this.password
        })
      });

      const payload = await response.json() as RegisterApiResponse;
      if (!response.ok) {
        throw new Error(payload.message || 'No fue posible registrar la cuenta.');
      }

      this.successMessage = 'Registro completado correctamente. Tu cuenta fue creada con éxito.';
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'No fue posible registrar la cuenta.';
      if (rawMessage.toLowerCase().includes('duplicate key value') || rawMessage.toLowerCase().includes('users_email_key')) {
        this.errorMessage = 'Ese correo electrónico ya está registrado. Usa otro correo o inicia sesión.';
      } else {
        this.errorMessage = rawMessage;
      }
    } finally {
      this.isSubmitting = false;
    }
  }
}
