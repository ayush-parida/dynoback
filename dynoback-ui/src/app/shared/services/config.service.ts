import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  public http = inject(HttpClient);
  public apiUrl = environment.api;
  constructor() {}
}
