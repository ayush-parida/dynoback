import { Component, ViewChild, inject } from '@angular/core';
import { SharedModule } from '../../../shared/classes/shared.module';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Admin, PaginatedAdminResponse } from './helpers/admin.interface';
import { AdminService } from './helpers/admin.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { uniqueEmailValidator } from '../../../shared/classes/admin-email.validator';
import { ConfigService } from '../../../shared/services/config.service';
import { Subscription, of } from 'rxjs';

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './admin-management.component.html',
  styleUrl: './admin-management.component.scss',
})
export class AdminManagementComponent {
  loading: boolean = false;
  screenLoading: boolean = false;
  adminSidebarLoading: boolean = false;
  isView: boolean = false;
  actionUuid: string = '';
  menubarItems: MenuItem[] = [
    {
      label: 'Refresh',
      icon: 'pi pi-refresh',
      command: (event) => {
        this.getAdmins();
      },
    },
    {
      label: 'Add Admin',
      icon: 'pi pi-plus',
      command: (event) => {
        this.addAdmin();
      },
    },
  ];

  admins: Admin[] = [];
  pagination = {
    currentPage: 1,
    itemsPerPage: 10,
    totalAdmins: 0,
    totalPages: 0,
  };

  avatars: any[] = [];
  searchBar: string = '';
  adminFormGroup: FormGroup = new FormGroup({});
  adminService = inject(AdminService);
  adminFormSidebarVisible: boolean = false;
  subscriptions: Subscription = new Subscription();
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);
  private configService = inject(ConfigService);
  constructor() {
    this.getAdmins();
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
            this.actionUuid ? true : false
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
  private getAdmins(): void {
    const { currentPage, itemsPerPage } = this.pagination;
    this.loading = true;
    this.subscriptions.add(
      this.adminService
        .getActiveAdmins(currentPage, itemsPerPage, this.searchBar)
        .subscribe({
          next: (response: PaginatedAdminResponse) => {
            this.admins = response.admins;
            // Update the pagination object with the response data
            this.pagination.totalAdmins = response.pagination.total_admins;
            this.pagination.totalPages = response.pagination.total_pages;
            this.loading = false;
          },
          error: (error) => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: error.error.message,
            });
          },
        })
    );
  }
  private loadAvatars() {
    this.subscriptions.add(
      this.adminService.getAvatars().subscribe((data) => {
        this.avatars = data.map((item) => ({
          id: item.id,
          path: item.path,
          // Assuming the avatar image name is indicative of the avatar's identity
          name: item.path.split('/').pop().split('.')[0], // Extracting name from file name
        }));
      })
    );
  }
  onPageChange(event: any) {
    this.pagination.currentPage = event.first / event.rows + 1;
    this.pagination.itemsPerPage = event.rows;
    this.getAdmins();
  }
  search() {
    this.getAdmins();
  }

  addAdmin() {
    this.adminFormSidebarVisible = true;
  }
  confirmClose(event: any) {
    if (!this.isView) {
      this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: 'Are you sure that you want to close?',
        header: 'Close Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptIcon: 'none',
        rejectIcon: 'none',
        acceptButtonStyleClass: 'p-button-danger p-button-text',
        rejectButtonStyleClass: 'p-button-text p-button-text',
        accept: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'User not created',
            detail: 'Form Cleared',
            life: 3000,
          });
          this.closeFormSidebar();
        },
        reject: () => {},
      });
    } else {
      this.closeFormSidebar();
    }
  }
  private closeFormSidebar() {
    this.adminFormSidebarVisible = false;
    this.adminFormGroup.reset();
    this.adminFormGroup.markAsUntouched();
    this.adminFormGroup.markAsPristine();
    this.adminFormGroup = this.initAdminForm();
    this.actionUuid = '';
  }
  submitAdmin() {
    console.log(this.adminFormGroup);
    if (this.adminFormGroup.valid) {
      this.adminSidebarLoading = true;
      let requestObservable;
      if (this.actionUuid) {
        requestObservable = this.adminService.putAdmin(
          this.adminFormGroup.value,
          this.actionUuid
        );
      } else {
        requestObservable = this.adminService.postAdmin(
          this.adminFormGroup.value
        );
      }

      this.subscriptions.add(
        requestObservable.subscribe({
          next: (response) => {
            this.adminSidebarLoading = false;
            if (response.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'Success!',
                detail: response.message,
                life: 3000,
              });
              this.closeFormSidebar();
            } else {
              this.messageService.add({
                severity: 'info',
                summary: 'Warning!',
                detail: response.message,
                life: 3000,
              });
            }
          },
          error: (error) => {
            this.adminSidebarLoading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error! Failed!',
              detail: error.error.message,
            });
          },
        })
      );
    }
  }
  editClick(admin: Admin) {
    this.adminFormSidebarVisible = true;
    this.actionUuid = admin.uuid;
    this.adminFormGroup = this.initAdminForm(admin);
  }
  viewClick(admin: Admin) {
    this.adminFormSidebarVisible = true;
    this.isView = true;
    this.adminFormGroup = this.initAdminForm(admin);
    this.adminFormGroup.disable();
  }
  deleteClick(event: any, uuid: string) {
    this.actionUuid = uuid;
    if (!this.isView) {
      this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: 'Are you sure that you want to delete?',
        header: 'Delete Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptIcon: 'none',
        rejectIcon: 'none',
        acceptButtonStyleClass: 'p-button-danger p-button-text',
        rejectButtonStyleClass: 'p-button-text p-button-text',
        accept: () => {
          this.deleteAdmin();
        },
        reject: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'Action Canceled',
            detail: 'User not deleted',
            life: 3000,
          });
        },
      });
    } else {
      this.closeFormSidebar();
    }
  }
  private deleteAdmin(): void {
    this.screenLoading = true;
    this.subscriptions.add(
      this.adminService.deleteAdmin(this.actionUuid).subscribe({
        next: (response) => {
          this.screenLoading = false;
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success!',
              detail: response.message,
              life: 3000,
            });
            this.getAdmins();
          } else {
            this.messageService.add({
              severity: 'info',
              summary: 'Warning!',
              detail: response.message,
              life: 3000,
            });
          }
        },
        error: (error) => {
          this.screenLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: error.error.message,
          });
        },
      })
    );
  }
}
