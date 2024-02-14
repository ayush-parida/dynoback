import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Retrieve the token from storage
  const currentUser =
    localStorage.getItem('currentUser') ||
    sessionStorage.getItem('currentUser');
  const token = currentUser ? JSON.parse(currentUser).token : null;

  if (token) {
    // If token exists, clone the request and add the authorization header
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
