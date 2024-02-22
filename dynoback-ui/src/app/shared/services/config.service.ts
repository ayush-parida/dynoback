import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  public http = inject(HttpClient);
  public apiUrl = environment.api;
  private authService = inject(AuthService);
  constructor() {}

  handleError(error: any) {
    if (error.status === 401) {
      this.authService.logout();
    }
    return throwError(() => error);
  }
}
