import { ValidatorFn, AbstractControl } from '@angular/forms';

export function emailDomainValidator(allowedDomains: string[]): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (!control.value) {
      // if control is empty return no error
      return null;
    }
    const domain = control.value.split('@')[1];
    if (allowedDomains.includes(domain)) {
      return null; // return no error (valid)
    } else {
      return { emailDomain: true }; // return error (invalid)
    }
  };
}

export function urlDomainValidator(allowedDomains: string[]): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (!control.value) {
      // if control is empty return no error
      return null;
    }
    try {
      const url = new URL(control.value);
      const domain = url.hostname;
      if (
        allowedDomains.some((allowedDomain) => domain.endsWith(allowedDomain))
      ) {
        return null; // valid
      }
      return { urlDomain: true }; // invalid
    } catch (error) {
      return { url: true }; // invalid URL
    }
  };
}

export function selectFieldValueValidator(allowedValues: any[]): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (allowedValues.includes(control.value)) {
      return null; // valid
    }
    return { selectFieldValue: true }; // invalid
  };
}

export function dateRangeValidator(
  minDateStr?: string,
  maxDateStr?: string
): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (!control.value) {
      // if control is empty return no error
      return null;
    }
    const inputDate = new Date(control.value);
    if (!isNaN(inputDate.getTime())) {
      // Check if the inputDate is a valid date
      if (minDateStr) {
        const minDate = new Date(minDateStr);
        if (inputDate < minDate) {
          return { minDate: { minDate: minDateStr, actual: control.value } }; // return error if inputDate is less than minDate
        }
      }
      if (maxDateStr) {
        const maxDate = new Date(maxDateStr);
        if (inputDate > maxDate) {
          return { maxDate: { maxDate: maxDateStr, actual: control.value } }; // return error if inputDate is greater than maxDate
        }
      }
      return null; // return no error if all validations pass
    }
    return { dateInvalid: true }; // return error if inputDate is not a valid date
  };
}
