import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Admin, PaginatedAdminResponse } from './admin.interface';
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
    perPage: number,
    search: string
  ): Observable<PaginatedAdminResponse> {
    var params: any = {
      page: page.toString(),
      per_page: perPage.toString(),
    };
    if (search) {
      params['search'] = search;
    }
    return this.http.get<PaginatedAdminResponse>(`${this.apiUrl}/admins`, {
      params,
    });
  }
  getAvatars(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/avatars`).pipe(
      catchError((error) => {
        return this.handleError(error);
      })
    );
  }
  postAdmin(admin: Admin) {
    return this.http.post<any>(`${this.apiUrl}/admins`, admin).pipe(
      catchError((error) => {
        return this.handleError(error);
      })
    );
  }
  putAdmin(admin: Admin, uuid: string) {
    return this.http.put<any>(`${this.apiUrl}/admins/${uuid}`, admin).pipe(
      catchError((error) => {
        return this.handleError(error);
      })
    );
  }
  deleteAdmin(uuid: string) {
    return this.http.delete<any>(`${this.apiUrl}/admins/${uuid}`).pipe(
      catchError((error) => {
        return this.handleError(error);
      })
    );
  }

  private handleError(error: any) {
    if (error.status === 401) {
      this.authService.logout();
    }
    return throwError(() => error);
  }
}
