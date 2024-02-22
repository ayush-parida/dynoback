import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { ConfigService } from '../../../shared/services/config.service';
import { Observable, catchError } from 'rxjs';
import { Database } from './database.interface';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  config = inject(ConfigService);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private apiUrl = this.config.apiUrl;
  constructor() {}

  getDatabases(): Observable<Database[]> {
    return this.http.get<Database[]>(`${this.apiUrl}/databases`).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }
}
