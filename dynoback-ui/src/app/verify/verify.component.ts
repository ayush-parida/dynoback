import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [],
  templateUrl: './verify.component.html',
  styleUrl: './verify.component.scss',
})
export class VerifyComponent {
  message: string = 'Verifying... Please Wait';
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  constructor() {
    this.route.queryParams.subscribe((params) => {
      console.log(params);
      const token = params['token'];
      const schemaName = params['schema'];
      if (!token || !schemaName) {
        this.router.navigate(['/login']);
      } else {
        const url = '/api/' + schemaName + '/verify_email';
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        };

        fetch(url, options)
          .then((response) => {
            if (!response.ok) {
              this.message = 'Verification Failed. This tab can be closed.';
              setTimeout(function () {
                // window.close();
              }, 5000);
              throw new Error('Network response was not ok');
            }
          })
          .then((data) => {
            this.message = 'Verified Successfully. This tab can be closed.';
            setTimeout(function () {
              // window.close();
            }, 5000);
          })
          .catch((error) => {
            this.message = 'Verification Failed. This tab can be closed.';
            setTimeout(function () {
              // window.close();
            }, 5000);
          });
      }
    });
  }
}
