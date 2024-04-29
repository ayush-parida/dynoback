import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../shared/classes/shared.module';
import { Subscription } from 'rxjs';
import { AdminService } from '../admin-management/helpers/admin.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfigService } from '../../../shared/services/config.service';
import { uniqueEmailValidator } from '../../../shared/classes/admin-email.validator';
import {
  Admin,
  PaginatedAdminResponse,
} from '../admin-management/helpers/admin.interface';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  avatars: any[] = [];
  adminService = inject(AdminService);
  private messageService = inject(MessageService);
  subscriptions: Subscription = new Subscription();
  loading: boolean = false;
  screenLoading: boolean = false;
  adminSidebarLoading: boolean = false;
  isView: boolean = false;
  actionUuid: string = '';
  adminFormGroup: FormGroup = new FormGroup({});
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);
  private configService = inject(ConfigService);

  constructor() {
    // this.getAdmins();
    this.loadAvatars();
    this.adminFormGroup = this.initAdminForm();
  }

  initAdminForm(admin?: Admin): FormGroup {
    var formGroup = this.fb.group({
      email: [
        '',
        [Validators.required, Validators.email],
        [
          uniqueEmailValidator(
            this.configService.http,
            this.configService.apiUrl,
            this.actionUuid || this.isView ? true : false
          ),
        ],
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
      emailVerified: [false, Validators.required],
      passwordResetDone: [false, Validators.required],
      avatar: [null],
      access: this.fb.group({
        collections: this.fb.group({
          create: [false, Validators.required],
          read: [false, Validators.required],
          update: [false, Validators.required],
          delete: [false, Validators.required],
          import: [false, Validators.required],
          edit: [false, Validators.required],
        }),
        admins: this.fb.group({
          create: [false, Validators.required],
          read: [false, Validators.required],
          update: [false, Validators.required],
          delete: [false, Validators.required],
        }),
        application: this.fb.group({
          read: [false, Validators.required],
          update: [false, Validators.required],
        }),
        importSchemas: [false, Validators.required],
        exportSchemas: [false, Validators.required],
        tokenManagement: [false, Validators.required],
        mailManagement: [false, Validators.required],
        logs: [false, Validators.required],
        backupManagement: [false, Validators.required],
      }),
    });
    if (admin) {
      formGroup.patchValue(admin);
      formGroup.controls.email.disable();
    }
    return formGroup;
  }

  // private getAdmins(): void {
  //   const { current_page, per_page, sort_by, sort_order } = this.pagination;
  //   this.loading = true;
  //   this.subscriptions.add(
  //     this.adminService
  //       .getActiveAdmins(
  //         current_page,
  //         per_page,
  //         sort_by,
  //         sort_order,
  //         this.searchBar
  //       )
  //       .subscribe({
  //         next: (response: PaginatedAdminResponse) => {
  //           this.admins = response.admins;
  //           this.pagination.total_admins = response.pagination.total_admins;
  //           this.pagination.total_pages = response.pagination.total_pages;
  //           this.pagination.sort_by = response.pagination.sort_by;
  //           this.pagination.sort_order = response.pagination.sort_order;
  //           this.loading = false;
  //         },
  //         error: (error) => {
  //           this.loading = false;
  //           this.messageService.add({
  //             severity: 'error',
  //             summary: 'Failed',
  //             detail: error.error.message,
  //           });
  //         },
  //       })
  //   );
  // }

  private loadAvatars() {
    this.subscriptions.add(
      this.adminService.getAvatars().subscribe({
        next: (data) => {
          this.avatars = data.map((item) => ({
            id: item.id,
            path: item.path,
            name: item.path.split('/').pop().split('.')[0],
          }));
        },
        error: (error) => {
          // this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to Load Avatars',
            detail: error.error.message,
          });
        },
      })
    );
  }
}
