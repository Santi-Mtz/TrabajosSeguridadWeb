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
import { StorageService } from '../../services/storage.service';
import { AppPermission } from '../../services/authorization.service';
import { environment } from '../../../environments/environment';

type LoginApiData = {
  id: number;
  username: string;
  email: string;
  login_date: string;
  permissions: string[];
};

type LoginApiResponse = {
  statusCode: number;
  intOpCode: string;
  message: string;
  data: LoginApiData | null;
};

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
  private readonly gatewayLoginUrl = `${environment.apiGatewayUrl}/auth/login`;
  private readonly permissionsStorageKey = 'crud.user.permissions';

  constructor(
    private readonly router: Router,
    private readonly authSession: AuthSessionService,
    private readonly validation: ValidationService,
    private readonly storage: StorageService
  ) {}

  email = '';
  passwordValue = '';
  isSubmitting = false;

  loginError = '';
  loginSuccess = '';

  get canSubmit(): boolean {
    return this.validation.isValidEmail(this.email) && this.passwordValue.trim().length > 0;
  }

  async onLogin(): Promise<void> {
    this.loginError = '';
    this.loginSuccess = '';

    const email = this.email.trim().toLowerCase();
    const password = this.passwordValue.trim();

    if (!this.validation.isValidEmail(email)) {
      this.loginError = 'Por favor, ingresa una dirección de correo electrónico válida.';
      return;
    }

    this.isSubmitting = true;

    try {
      const response = await fetch(this.gatewayLoginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const payload = await response.json() as LoginApiResponse;
      if (!response.ok || !payload.data) {
        this.loginError = payload.message || 'No fue posible iniciar sesión. Verifica tu correo y contraseña e intenta nuevamente.';
        return;
      }

      const permissions = payload.data.permissions.filter((permission): permission is AppPermission =>
        typeof permission === 'string'
      );

      const existingMap = this.storage.getJson<Record<string, AppPermission[]>>(this.permissionsStorageKey) ?? {};
      existingMap[email] = permissions;
      this.storage.setJson(this.permissionsStorageKey, existingMap);

      this.authSession.setCurrentUser({
        id: payload.data.id,
        email: payload.data.email,
        displayName: payload.data.username
      });

      this.loginSuccess = 'Inicio de sesión exitoso. Redirigiendo al panel principal.';
      await this.router.navigate(['/dashboard']);
      return;
    } catch {
      this.loginError = 'No fue posible contactar el servicio de autenticación. Intenta nuevamente.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
