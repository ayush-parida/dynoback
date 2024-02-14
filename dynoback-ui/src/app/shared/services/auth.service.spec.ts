import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let authService: AuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    authService = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(authService).toBeTruthy();
  });

  it('should send login request with correct data', () => {
    const email = 'test@example.com';
    const password = 'password';
    const rememberMe = true;
    const mockUser = { id: 1, username: 'testUser' };

    authService.login(email, password, rememberMe).subscribe((user) => {
      expect(user).toEqual(mockUser);
    });

    const req = httpTestingController.expectOne(`${environment.api}/login`);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body).toEqual({ email, password });
    req.flush(mockUser);
  });

  it('should remove current user from storage and reset currentUserSource on logout', () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ id: 1, username: 'testUser' })
    );
    spyOn(localStorage, 'removeItem');
    spyOn(authService.currentUserSource, 'set');

    authService.logout();

    expect(localStorage.removeItem).toHaveBeenCalledWith('currentUser');
    expect(authService.currentUserSource.set).toHaveBeenCalledWith(null);
  });

  it('should send forgot password request with correct email', () => {
    const email = 'test@example.com';

    authService.forgotPassword(email).subscribe(() => {});

    const req = httpTestingController.expectOne(
      `${environment.api}/forgot-password`
    );
    expect(req.request.method).toEqual('POST');
    expect(req.request.body).toEqual({ email });
    req.flush({});
  });

  it('should send refresh token request and update current user', fakeAsync(() => {
    const mockUser = { id: 1, username: 'testUser' };

    authService.refreshToken().subscribe((user) => {
      expect(user).toEqual(mockUser);
    });

    const req = httpTestingController.expectOne(
      `${environment.api}/refresh-token`
    );
    expect(req.request.method).toEqual('GET');
    req.flush(mockUser);

    tick();
    expect(localStorage.getItem('currentUser')).toEqual(
      JSON.stringify(mockUser)
    );
    expect(authService.currentUserSource()).toEqual(mockUser);
  }));
});
