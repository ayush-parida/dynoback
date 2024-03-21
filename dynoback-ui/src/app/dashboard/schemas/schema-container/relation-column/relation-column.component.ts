import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { CommonModule } from '@angular/common';
import { MenuItem, MessageService } from 'primeng/api';
import { SchemaService } from '../../helpers/schema.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-relation-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './relation-column.component.html',
  styleUrl: './relation-column.component.scss',
})
export class RelationColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
  @Output()
  customIndexChangeEmit = new EventEmitter<boolean>();
  selectedChange(event: any) {
    this.customIndexChangeEmit.emit(true);
  }
  @Input()
  connectionPoolId: string = '';
  @Input()
  schemaUuid: string = '';
  schemas: any[] = [];
  private schemaService = inject(SchemaService);
  private messageService = inject(MessageService);
  subscriptions: Subscription = new Subscription();

  constructor() {
    this.getSchemas();
  }
  getSchemas(): void {
    this.subscriptions.add(
      this.schemaService.getSchemas().subscribe({
        next: (data) => {
          this.schemas = data.filter(
            (x) =>
              x.connectionPoolId == this.connectionPoolId &&
              x.uuid != this.schemaUuid
          );

          this.column.options.collectionId = this.connectionPoolId;
        },
        error: (error) => {
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
