import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  // Try to retrieve the token from both localStorage and sessionStorage
  const currentUser =
    localStorage.getItem('currentUser') ||
    sessionStorage.getItem('currentUser');
  const token = currentUser ? JSON.parse(currentUser).token : null;

  if (token) {
    // Optionally, validate token's integrity or expiration here
    return true;
  } else {
    router.navigate(['/admin/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }
};
