import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { Database } from '../helpers/database.interface';
import { SharedModule } from '../../../shared/classes/shared.module';
import { DatabaseService } from '../helpers/database.service';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-database-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './database-details.component.html',
  styleUrl: './database-details.component.scss',
})
export class DatabaseDetailsComponent implements OnChanges {
  @Input()
  database_uuid: string = '';
  @Output()
  editEmit = new EventEmitter<any>();
  @Output()
  closeEmit = new EventEmitter<any>();
  loading: boolean = false;
  database: Database = {} as Database;
  objectKeys = Object.keys;
  menubarItems: MenuItem[] = [
    {
      label: 'Refresh',
      icon: 'pi pi-refresh',
      command: (event) => {
        this.getDatabaseById();
      },
    },
    {
      label: 'Actions',
      items: [
        {
          label: 'Edit Connection',
          icon: 'pi pi-pencil',
          command: (event) => {
            this.editOpen();
          },
        },
        {
          label: 'Delete Connection',
          icon: 'pi pi-trash',
          command: (event) => {
            this.deleteClick(event);
          },
        },
      ],
    },
    {
      label: 'Test Connection',
      icon: 'pi pi-wifi',
      command: (event) => {
        this.testConnection();
      },
    },
  ];
  subscriptions: Subscription = new Subscription();
  private confirmationService = inject(ConfirmationService);
  private databaseService = inject(DatabaseService);
  private messageService = inject(MessageService);
  constructor() {}
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['database_uuid']) {
      this.getDatabaseById();
    }
  }

  getDatabaseById() {
    this.databaseService.getDatabaseById(this.database_uuid).subscribe({
      next: (data) => {
        this.loading = false;
        this.database = data;
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to Load Databases',
          detail: error.error.message,
        });
      },
    });
  }
  private editOpen() {
    this.editEmit.emit(this.database);
  }

  private deleteClick(event: any) {
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
        this.deleteDatabase();
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
  }
  private deleteDatabase(): void {
    this.loading = true;
    this.subscriptions.add(
      this.databaseService.deleteDatabase(this.database_uuid).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success!',
              detail: response.message,
              life: 3000,
            });
            this.close();
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
  close() {
    this.closeEmit.emit(true);
  }
  private testConnection() {
    this.loading = true;
    this.subscriptions.add(
      this.databaseService
        .databaseConnectionTest(this.database_uuid)
        .subscribe({
          next: (response) => {
            this.loading = false;
            if (response.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'Success!',
                detail: response.message,
                life: 3000,
              });
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
}
