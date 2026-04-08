import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  isAvailable(): boolean {
    return 'localStorage' in globalThis;
  }

  getItem(key: string): string | null {
    return this.isAvailable() ? localStorage.getItem(key) : null;
  }

  setItem(key: string, value: string): void {
    if (!this.isAvailable()) {
      return;
    }

    localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (!this.isAvailable()) {
      return;
    }

    localStorage.removeItem(key);
  }

  getJson<T>(key: string): T | null {
    const raw = this.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  }

  setJson(key: string, value: unknown): void {
    this.setItem(key, JSON.stringify(value));
  }
}
