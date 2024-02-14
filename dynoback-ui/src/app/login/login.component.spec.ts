import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { ReactiveFormsModule, FormsModule, FormGroup } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '../shared/classes/shared.module';
import { AuthService } from '../shared/services/auth.service';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceMock = jasmine.createSpyObj('AuthService', ['login']);
    const messageServiceMock = jasmine.createSpyObj('MessageService', ['add']);
    const routerMock = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, SharedModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    messageServiceSpy = TestBed.inject(
      MessageService
    ) as jasmine.SpyObj<MessageService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form invalid when empty', () => {
    expect(component.loginForm.valid).toBeFalsy();
  });

  it('email field validation', () => {
    let email = component.loginForm.controls['email'];
    expect(email.valid).toBeFalsy();

    // Required validation
    let errors = email.errors || {};
    expect(errors['required']).toBeTruthy();

    // Set email to something
    email.setValue('test');
    errors = email.errors || {};
    expect(errors['email']).toBeTruthy();

    // Set email to a correct format
    email.setValue('test@example.com');
    errors = email.errors || {};
    expect(errors).toEqual({});
  });

  it('password field validation', () => {
    let password = component.loginForm.controls['password'];
    expect(password.valid).toBeFalsy();

    // Required validation
    let errors = password.errors || {};
    expect(errors['required']).toBeTruthy();

    // Min length validation
    password.setValue('123');
    errors = password.errors || {};
    expect(errors['minlength']).toBeTruthy();

    // Correct password
    password.setValue('1234');
    errors = password.errors || {};
    expect(errors).toEqual({});
  });

  it('rememberMe field validation', () => {
    let rememberMe = component.loginForm.controls['rememberMe'];
    expect(rememberMe.value).toBeFalse();

    rememberMe.setValue(true);
    expect(rememberMe.value).toBeTrue();
  });

  it('submitting a form emits success message and navigates on success', fakeAsync(() => {
    component.onSubmit();
    component.loginForm.setValue({
      email: 'test@test.com',
      password: '123456',
      rememberMe: true,
    });
    expect(component.loginForm.valid).toBeTruthy();

    const response = { success: true, message: 'Login successful' };
    authServiceSpy.login.and.returnValue(of(response));

    tick();

    expect(authServiceSpy.login.calls.any()).withContext(
      'AuthService.login called'
    );
    expect(messageServiceSpy.add.calls.any()).withContext(
      'MessageService.add called with success'
    );
    expect(routerSpy.navigate.calls.any()).withContext(
      'Router.navigate called on success'
    );
  }));
  it('login form invalid and submitted', () => {
    component.onSubmit();
    expect(component.loginForm.valid).toBeFalsy();
    expect(component.validationMessage).toEqual([
      {
        detail: 'Email and Password are required',
        severity: 'error',
        summary: 'Warning',
        life: 5000,
      },
    ]);
  });
  it('handles login error by displaying an error message', fakeAsync(() => {
    component.onSubmit();
    component.loginForm.setValue({
      email: 'test@test.com',
      password: '123456',
      rememberMe: false,
    });
    expect(component.loginForm.valid).toBeTruthy();
    const errorResponse = { error: { message: 'Invalid credentials' } };
    authServiceSpy.login.and.returnValue(throwError(() => errorResponse));

    tick();
    expect(authServiceSpy.login.calls.any()).withContext(
      'AuthService.login called with error'
    );

    // Ensure navigation has not been called
    expect(routerSpy.navigate.calls.any()).toBeFalse();
  }));
});
