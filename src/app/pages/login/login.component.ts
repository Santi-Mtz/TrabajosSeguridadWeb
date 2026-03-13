import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { AuthSessionService } from '../../services/auth-session.service';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { ValidationService } from '../../services/validation.service';

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
    ButtonModule,
    MessageModule,
    AuthShellComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  constructor(
    private readonly router: Router,
    private readonly authSession: AuthSessionService,
    private readonly validation: ValidationService
  ) {}

  email = '';
  passwordValue = '';

  loginError = '';
  loginSuccess = '';

  private readonly validCredentials = [
    {
      email: 'admin@seguridadweb.com',
      password: 'Admin@12345',
      displayName: 'Administrador'
    },
    {
      email: 'superadmin@seguridadweb.com',
      password: 'Admin@12345',
      displayName: 'superAdmin'
    },
    {
      email: 'santiago.martinez@example.com',
      password: 'Admin@12345',
      displayName: 'Santiago Martinez'
    }
  ];

  get canSubmit(): boolean {
    return this.validation.isValidEmail(this.email) && this.passwordValue.trim().length > 0;
  }

  onLogin(): void {
    this.loginError = '';
    this.loginSuccess = '';

    const email = this.email.trim().toLowerCase();
    const password = this.passwordValue.trim();

    if (!this.validation.isValidEmail(email)) {
      this.loginError = 'Ingresa un correo válido.';
      return;
    }

    const matchedCredential = this.validCredentials.find((credential) =>
      credential.email.toLowerCase() === email && credential.password === password
    );

    if (matchedCredential) {
      this.authSession.setCurrentUser({
        email,
        displayName: matchedCredential.displayName
      });

      this.loginSuccess = 'Credenciales válidas. Inicio de sesión correcto.';
      void this.router.navigate(['/dashboard']);
      return;
    }

    this.loginError = 'Credenciales inválidas. Verifica el correo y la contraseña.';
  }
}
