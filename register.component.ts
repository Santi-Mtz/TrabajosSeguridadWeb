import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';

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
    CardModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  username = '';
  fullName = '';
  address = '';
  phone = '';
  birthDate = '';
  email = '';
  password = '';
  confirmPassword = '';

  submitAttempted = false;
  successMessage = '';

  readonly specialSymbolDescription = '! @ # $ % ^ & * ( ) _ + - = { } ; : , . ?';
  private readonly specialSymbolRegex = /[!@#$%^&*()_+\-={};:,.?]/;
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly phoneRegex = /^\d{7,15}$/;

  get hasValidEmail(): boolean {
    return this.emailRegex.test(this.email.trim());
  }

  get hasValidPhone(): boolean {
    return this.phoneRegex.test(this.phone.trim());
  }

  get hasStrongPassword(): boolean {
    return (
      this.password.length >= 10 &&
      this.specialSymbolRegex.test(this.password)
    );
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  get isAdult(): boolean {
    if (!this.birthDate) {
      return false;
    }

    const today = new Date();
    const birth = new Date(this.birthDate);

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
      this.birthDate.trim().length > 0 &&
      this.email.trim().length > 0 &&
      this.phone.trim().length > 0 &&
      this.password.trim().length > 0 &&
      this.confirmPassword.trim().length > 0
    );
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
