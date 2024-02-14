import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.api;
  private http = inject(HttpClient);
  private router = inject(Router);
  public currentUserSource = signal(this.getUserFromStorage());
  public currentUser = this.currentUserSource();

  constructor() {
    // Listen for storage events to sync login state across tabs
    window.addEventListener('storage', this.syncSessionState.bind(this));
  }

  login(email: string, password: string, rememberMe: boolean) {
    return this.http
      .post<any>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        map((user) => {
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSource.set(user);
          return user;
        })
      );
  }

  logout() {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    this.currentUserSource.set(null);
    this.router.navigate(['/admin/login']);
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  refreshToken() {
    return this.http.get<any>(`${this.apiUrl}/refresh-token`).pipe(
      map((user) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSource.set(user);
        return user;
      })
    );
  }

  private getUserFromStorage() {
    const userJson =
      localStorage.getItem('currentUser') ||
      sessionStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
  }

  private syncSessionState(event: StorageEvent) {
    // If local or session storage changes, sync the user state in the app
    if (event.key === 'currentUser') {
      this.currentUserSource.set(this.getUserFromStorage());
    }
  }
}
