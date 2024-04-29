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
          .then(async (response) => {
            let res = await response.json();
            this.message = res.message;
            this.message += '<br>This Tab will close automatically!';
            setTimeout(function () {
              window.close();
            }, 5000);
          })
          .catch((error) => {
            setTimeout(function () {
              window.close();
            }, 5000);
          });
      }
    });
  }
}
