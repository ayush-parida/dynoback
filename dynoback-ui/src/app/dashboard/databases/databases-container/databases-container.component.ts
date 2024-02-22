import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../shared/classes/shared.module';
import { DatabaseService } from '../helpers/database.service';
import { Subscription } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DatabaseDetailsComponent } from '../database-details/database-details.component';
import { Database } from '../helpers/database.interface';

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
  subscriptions: Subscription = new Subscription();
  private databaseService = inject(DatabaseService);
  private messageService = inject(MessageService);

  constructor() {
    this.getDatabases();
  }

  getDatabases(): void {
    this.loading = true;
    this.subscriptions.add(
      this.databaseService.getDatabases().subscribe({
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
}
