import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { PaginatedAdminResponse } from './admin.interface';
import { Injectable, inject } from '@angular/core';
import { ConfigService } from '../../../../shared/services/config.service';
import { AuthService } from '../../../../shared/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  config = inject(ConfigService);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private apiUrl = this.config.apiUrl;

  getActiveAdmins(
    page: number,
    perPage: number
  ): Observable<PaginatedAdminResponse> {
    const params = {
      page: page.toString(),
      per_page: perPage.toString(),
    };
    return this.http.get<PaginatedAdminResponse>(`${this.apiUrl}/admins`, {
      params,
    });
  }
  getAvatars(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/avatars`).pipe(
      catchError((error) => {
        if (error.status === 401) {
          this.authService.logout();
        }
        return throwError(error);
      })
    );
  }
}
