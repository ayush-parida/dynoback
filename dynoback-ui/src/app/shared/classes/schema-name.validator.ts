import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, take, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

export function uniqueSchemaNameValidator(
  http: HttpClient,
  apiBaseUrl: string,
  isEdit: boolean
): ValidatorFn {
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
        switchMap((name) =>
          http
            .get<{ user_exists: boolean }>(
              `${apiBaseUrl}/schemas/unique-name/${name}`
            )
            .pipe(
              map((response) => {
                // If API indicates user exists, return validation error
                return response.user_exists ? { uniqueName: true } : null;
              }),
              catchError(() => of(null)) // On API error, just pass the validation
            )
        )
      );
    }
  };
}
