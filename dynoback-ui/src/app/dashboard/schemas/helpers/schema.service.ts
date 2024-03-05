import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ConfigService } from '../../../shared/services/config.service';
import { Observable, catchError } from 'rxjs';
import { SchemaType } from './schema.interface';

@Injectable({
  providedIn: 'root',
})
export class SchemaService {
  config = inject(ConfigService);
  private http = inject(HttpClient);

  private apiUrl = this.config.apiUrl;
  constructor() {}

  getSchemaTypes(): Observable<SchemaType[]> {
    return this.http.get<SchemaType[]>(`${this.apiUrl}/schema/types`).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }
  getColumns(): Observable<SchemaType[]> {
    return this.http.get<SchemaType[]>(`${this.apiUrl}/column/types`).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }
  getDatabasesKvp(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/databases/kvp`).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }
  postSchema(body: any): Observable<any[]> {
    return this.http.post<any>(`${this.apiUrl}/schema`, body).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }
  getSchemas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/schema`).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }
}
