import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly phoneRegex = /^\d{7,15}$/;
  private readonly specialSymbolRegex = /[!@#$%^&*()_+\-={};:,.?]/;

  isNotEmpty(value: string): boolean {
    return value.trim().length > 0;
  }

  isValidEmail(value: string): boolean {
    return this.emailRegex.test(value.trim());
  }

  isValidPhone(value: string): boolean {
    return this.phoneRegex.test(value.trim());
  }

  hasStrongPassword(value: string): boolean {
    return value.length >= 10 && this.specialSymbolRegex.test(value);
  }
}