import { Component, ViewChild, inject } from '@angular/core';
import { SharedModule } from '../../../shared/classes/shared.module';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Admin, PaginatedAdminResponse } from './helpers/admin.interface';
import { AdminService } from './helpers/admin.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { uniqueEmailValidator } from '../../../shared/classes/admin-email.validator';
import { ConfigService } from '../../../shared/services/config.service';

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './admin-management.component.html',
  styleUrl: './admin-management.component.scss',
})
export class AdminManagementComponent {
  loading: boolean = false;
  menubarItems: MenuItem[] = [
    {
      label: 'Refresh',
      command: (event) => {
        this.getAdmins();
      },
    },
    {
      label: 'Add Admin',
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
  addAdminSidebarVisible: boolean = false;
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);
  private configService = inject(ConfigService);
  constructor() {
    this.getAdmins();
    this.loadAvatars();
    this.initAdminForm();
  }
  initAdminForm() {
    this.adminFormGroup = this.fb.group({
      isActive: [true, Validators.required],
      isSuper: [false, Validators.required],
      email: [
        '',
        [Validators.required, Validators.email],
        [
          uniqueEmailValidator(
            this.configService.http,
            this.configService.apiUrl
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
  }
  getAdmins(): void {
    const { currentPage, itemsPerPage } = this.pagination;
    this.loading = true;
    this.adminService.getActiveAdmins(currentPage, itemsPerPage).subscribe({
      next: (response: PaginatedAdminResponse) => {
        this.admins = response.admins;
        // Update the pagination object with the response data
        this.pagination.totalAdmins = response.pagination.total_admins;
        this.pagination.totalPages = response.pagination.total_pages;
        this.loading = false;
      },
      error: (error) => {
        // Handle any errors that occur during the HTTP request
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: error.error.message,
        });
      },
    });
  }
  loadAvatars() {
    this.adminService.getAvatars().subscribe((data) => {
      this.avatars = data.map((item) => ({
        id: item.id,
        path: item.path,
        // Assuming the avatar image name is indicative of the avatar's identity
        name: item.path.split('/').pop().split('.')[0], // Extracting name from file name
      }));
    });
  }
  onPageChange(event: any) {
    this.pagination.currentPage = event.first / event.rows + 1;
    this.pagination.itemsPerPage = event.rows;
    this.getAdmins();
  }
  search() {
    console.log(this.searchBar);
  }

  addAdmin() {
    this.addAdminSidebarVisible = true;
  }
  confirmClose(event: any) {
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
        this.addAdminSidebarVisible = false;
        this.adminFormGroup.reset();
        this.adminFormGroup.markAsUntouched();
        this.adminFormGroup.markAsPristine();
        this.initAdminForm();
      },
      reject: () => {},
    });
  }
  submitAdmin() {
    console.log(this.adminFormGroup.value);
  }
}
