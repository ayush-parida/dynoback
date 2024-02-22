import { Component, Input } from '@angular/core';
import { Database } from '../helpers/database.interface';
import { SharedModule } from '../../../shared/classes/shared.module';

@Component({
  selector: 'app-database-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './database-details.component.html',
  styleUrl: './database-details.component.scss',
})
export class DatabaseDetailsComponent {
  @Input()
  database: Database = {} as Database;
  objectKeys = Object.keys;
}
