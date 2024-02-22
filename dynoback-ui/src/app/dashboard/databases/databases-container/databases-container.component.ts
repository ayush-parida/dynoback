import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../shared/classes/shared.module';
import { DatabaseService } from '../helpers/database.service';
import { Subscription } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DatabaseDetailsComponent } from '../database-details/database-details.component';
import { Database } from '../helpers/database.interface';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-databases-container',
  standalone: true,
  imports: [SharedModule, DatabaseDetailsComponent],
  templateUrl: './databases-container.component.html',
  styleUrl: './databases-container.component.scss',
})
export class DatabasesContainerComponent {
  databases: Database[] = [];
  loading: boolean = false;
  selectedDatabase: Database = {} as Database;
  databaseFormSidebarVisible: boolean = false;
  databaseFormGroup: FormGroup = new FormGroup({});
  databaseSidebarLoading: boolean = false;
  connectionTested: boolean = false;
  subscriptions: Subscription = new Subscription();
  private databaseService = inject(DatabaseService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);

  constructor() {
    this.getDatabases();
  }

  getDatabases(): void {
    this.loading = true;
    this.subscriptions.add(
      this.databaseService.getDatabasesKvp().subscribe({
        next: (data) => {
          this.loading = false;
          this.databases = data.map((item) => ({
            ...item,
            label: item.display_name,
          }));
          if (this.databases.length) {
            this.selectedDatabase = this.databases[0];
          }
        },
        error: (error) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to Load Databases',
            detail: error.error.message,
          });
        },
      })
    );
  }
  confirmClose(event: any) {
    console.log(event);
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
          summary: 'Action Canceled',
          detail: 'Form Cleared',
          life: 3000,
        });
        this.closeFormSidebar(true);
      },
      reject: () => {},
    });
  }
  private closeFormSidebar(clearSelected?: boolean) {
    this.databaseFormSidebarVisible = false;
    this.databaseFormGroup.reset();
    this.databaseFormGroup.markAsUntouched();
    this.databaseFormGroup.markAsPristine();
    this.databaseFormGroup = this.initDatabaseForm();
    if (!clearSelected) this.selectedDatabase = {} as Database;
  }
  private initDatabaseForm(database?: any): FormGroup {
    var formGroup = this.fb.group({
      display_name: ['', [Validators.required, Validators.minLength(3)]],
      name: ['', [Validators.required, Validators.minLength(3)]],
      user: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      host: ['', Validators.required],
      port: [null, [Validators.required, Validators.pattern('^[0-9]+$')]],
    });
    if (database) {
      formGroup.patchValue(database);
    }
    formGroup.valueChanges.subscribe(() => {
      this.connectionTested = false;
    });
    return formGroup;
  }
  editOpen(event: any) {
    this.databaseFormSidebarVisible = true;
    this.databaseFormGroup = this.initDatabaseForm(event);
  }
  addOpen() {
    this.databaseFormSidebarVisible = true;
    this.selectedDatabase = {} as Database;
    this.databaseFormGroup = this.initDatabaseForm();
  }
  testConnection() {
    if (this.databaseFormGroup.valid) {
      this.loading = true;
      let requestObservable;
      if (this.selectedDatabase.uuid) {
        requestObservable = this.databaseService.databaseConnectionTest(
          this.selectedDatabase.uuid
        );
      } else {
        requestObservable = this.databaseService.newDatabaseConnectionTest(
          this.databaseFormGroup.value
        );
      }
      this.subscriptions.add(
        requestObservable.subscribe({
          next: (response) => {
            this.loading = false;
            if (response.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'Success!',
                detail: response.message,
                life: 3000,
              });
              this.connectionTested = true;
            } else {
              this.messageService.add({
                severity: 'info',
                summary: 'Warning!',
                detail: response.message,
                life: 3000,
              });
              this.connectionTested = false;
            }
          },
          error: (error) => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error! Failed!',
              detail: error.error.message,
            });
            this.connectionTested = false;
          },
        })
      );
    }
  }
  submitDatabase() {
    if (this.databaseFormGroup.valid) {
      this.databaseSidebarLoading = true;
      let requestObservable;
      if (this.selectedDatabase.uuid) {
        requestObservable = this.databaseService.putDatabase(
          this.databaseFormGroup.value,
          this.selectedDatabase.uuid
        );
      } else {
        requestObservable = this.databaseService.postDatabase(
          this.databaseFormGroup.value
        );
      }

      this.subscriptions.add(
        requestObservable.subscribe({
          next: (response) => {
            this.databaseSidebarLoading = false;
            if (response.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'Success!',
                detail: response.message,
                life: 3000,
              });
              this.closeFormSidebar();
              this.getDatabases();
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
            this.databaseSidebarLoading = false;
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
  closeDetails(event: any) {
    if (event) {
      this.closeFormSidebar();
    }
  }
}
