import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    PasswordModule,
    ButtonModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  passwordValue = '';

  loginError = '';
  loginSuccess = '';

  private readonly validCredential = {
    email: 'admin@seguridadweb.com',
    password: 'Admin@12345'
  };

  get canSubmit(): boolean {
    return this.email.trim().length > 0 && this.passwordValue.trim().length > 0;
  }

  onLogin(): void {
    this.loginError = '';
    this.loginSuccess = '';

    const email = this.email.trim().toLowerCase();
    const password = this.passwordValue.trim();

    if (
      email === this.validCredential.email.toLowerCase() &&
      password === this.validCredential.password
    ) {
      this.loginSuccess = 'Credenciales válidas. Inicio de sesión correcto.';
      return;
    }

    this.loginError = 'Credenciales inválidas. Verifica el correo y la contraseña.';
  }
}
