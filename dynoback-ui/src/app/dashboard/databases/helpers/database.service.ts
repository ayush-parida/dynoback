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

  getDatabasesKvp(): Observable<Database[]> {
    return this.http.get<Database[]>(`${this.apiUrl}/databases/kvp`).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }
  getDatabaseById(uuid: string): Observable<Database> {
    return this.http.get<Database>(`${this.apiUrl}/databases/${uuid}`).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }
  postDatabase(database: Database) {
    return this.http.post<any>(`${this.apiUrl}/databases`, database).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }
  putDatabase(database: Database, uuid: string) {
    return this.http
      .put<any>(`${this.apiUrl}/databases/${uuid}`, database)
      .pipe(
        catchError((error) => {
          return this.config.handleError(error);
        })
      );
  }
  deleteDatabase(uuid: string) {
    return this.http.delete<any>(`${this.apiUrl}/databases/${uuid}`).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }
}
