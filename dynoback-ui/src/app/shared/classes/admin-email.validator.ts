import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, take, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

export function uniqueEmailValidator(
  http: HttpClient,
  apiBaseUrl: string
): ValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) {
      return of(null); // If no value is present, don't validate
    }

    return control.valueChanges.pipe(
      debounceTime(500), // Wait for the user to stop typing
      take(1), // Take the first value after the debounce time
      switchMap((email) =>
        http
          .get<{ user_exists: boolean }>(
            `${apiBaseUrl}/admins/unique-email/${email}`
          )
          .pipe(
            map((response) => {
              // If API indicates user exists, return validation error
              return response.user_exists ? { uniqueEmail: true } : null;
            }),
            catchError(() => of(null)) // On API error, just pass the validation
          )
      )
    );
  };
}
