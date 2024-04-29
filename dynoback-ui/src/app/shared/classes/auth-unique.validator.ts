import {
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
} from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, take, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

export function authUniqueValidator(
  http: HttpClient,
  apiBaseUrl: string,
  schema_name: string,
  type: 'unique_username' | 'unique_email',
  isEdit: boolean
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) {
      return of(null); // If no value is present, don't validate
    }
    if (isEdit) {
      return of(null);
    } else {
      return control.valueChanges.pipe(
        debounceTime(500), // Wait for the user to stop typing
        take(1), // Take the first value after the debounce time
        switchMap((val) =>
          http
            .post<{ exists: boolean }>(
              `${apiBaseUrl}/${schema_name}/check/${type}`,
              { value: val }
            )
            .pipe(
              map((response) => {
                // If API indicates user exists, return validation error
                return response.exists ? { unique: true } : null;
              }),
              catchError(() => of(null)) // On API error, just pass the validation
            )
        )
      );
    }
  };
}
