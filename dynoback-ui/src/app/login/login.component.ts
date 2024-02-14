import { Component, inject } from '@angular/core';
import { SharedModule } from '../shared/classes/shared.module';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../shared/services/auth.service';
import { Router } from '@angular/router';
import { Message, MessageService } from 'primeng/api';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(4),
    ]),
    rememberMe: new FormControl(false),
  });
  validationMessage: Message[] = [];
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  onSubmit() {
    if (this.loginForm.valid) {
      const email = this.loginForm.value.email as string;
      const password = this.loginForm.value.password as string;
      const rememberMe = this.loginForm.value.rememberMe as boolean;

      this.authService.login(email, password, rememberMe).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: response.message,
            });
          }
          // Navigate to dashboard or home page on successful login
          this.router.navigate(['/admin']);
        },
        error: (error) => {
          // Handle login error here (e.g., show error message)
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: error.error.message,
          });
        },
      });
    } else {
      this.validationMessage = [
        {
          detail: 'Email and Password are required',
          severity: 'error',
          summary: 'Warning',
          life: 5000,
        },
      ];
    }
  }
}
