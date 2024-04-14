import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ConfigService } from '../../../shared/services/config.service';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  config = inject(ConfigService);
  private http = inject(HttpClient);

  private apiUrl = this.config.apiUrl;
  getEntries(
    schemaName: string,
    page: number,
    per_page: number,
    sort_by: string,
    sort_order: string,
    filter?: string, // Optional filter parameter
    fields?: string[] // Optional fields parameter
  ): Observable<any> {
    let params: any = {
      page: page,
      per_page: per_page,
      sort_by: sort_by,
      sort_order: sort_order,
    };

    // If filters are provided, include them in the request parameters
    if (filter) {
      params.filter = filter;
    }

    // If specific fields are requested, join them into a comma-separated string
    if (fields && fields.length > 0) {
      params.fields = 'uuid,created,updated,is_active,' + fields.join(',');
    }

    return this.http
      .get<any[]>(`${this.apiUrl}/${schemaName}`, { params })
      .pipe(
        catchError((error) => {
          // Implement your error handling logic here
          console.error('An error occurred:', error);
          throw error;
        })
      );
  }

  postEntry(schemaName: string, entry: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${schemaName}`, entry).pipe(
      catchError((error) => {
        return this.config.handleError(error);
      })
    );
  }

  putEntry(
    schemaName: string,
    entryUuid: string,
    entry: string
  ): Observable<any> {
    return this.http
      .put<any>(`${this.apiUrl}/${schemaName}/${entryUuid}`, entry)
      .pipe(
        catchError((error) => {
          return this.config.handleError(error);
        })
      );
  }
  deleteEntry(schemaName: string, entryUuid: string): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/${schemaName}/${entryUuid}`)
      .pipe(
        catchError((error) => {
          return this.config.handleError(error);
        })
      );
  }
}
