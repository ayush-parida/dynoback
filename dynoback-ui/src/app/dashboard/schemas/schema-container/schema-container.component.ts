import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../shared/classes/shared.module';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService, ConfirmationService, MenuItem } from 'primeng/api';
import { Subscription } from 'rxjs';
import { Database } from '../../databases/helpers/database.interface';
import { SchemaService } from '../helpers/schema.service';
import { Column, SchemaType } from '../helpers/schema.interface';
import { uniqueSchemaNameValidator } from '../../../shared/classes/schema-name.validator';
import { ConfigService } from '../../../shared/services/config.service';
import { AccordionModule } from 'primeng/accordion';
import { FIELD_TYPE } from '../helpers/schema.enum';
import { TextColumnComponent } from './text-column/text-column.component';
import { NumberColumnComponent } from './number-column/number-column.component';
import { BoolColumnComponent } from './bool-column/bool-column.component';
import { EditorColumnComponent } from './editor-column/editor-column.component';
import { EmailColumnComponent } from './email-column/email-column.component';
import { UrlColumnComponent } from './url-column/url-column.component';
import { DateColumnComponent } from './date-column/date-column.component';
import { SelectColumnComponent } from './select-column/select-column.component';
import { FileColumnComponent } from './file-column/file-column.component';
import { JsonColumnComponent } from './json-column/json-column.component';
import { RelationColumnComponent } from './relation-column/relation-column.component';

@Component({
  selector: 'app-schema-container',
  standalone: true,
  imports: [
    SharedModule,
    AccordionModule,
    TextColumnComponent,
    EditorColumnComponent,
    NumberColumnComponent,
    BoolColumnComponent,
    EmailColumnComponent,
    UrlColumnComponent,
    DateColumnComponent,
    SelectColumnComponent,
    FileColumnComponent,
    JsonColumnComponent,
    RelationColumnComponent,
  ],
  templateUrl: './schema-container.component.html',
  styleUrl: './schema-container.component.scss',
})
export class SchemaContainerComponent {
  loading: boolean = false;
  selectedSchema: any = {};
  schemas: any[] = [];
  schemaTypes: SchemaType[] = [];
  schemaFormSidebarVisible: boolean = false;
  schemaSidebarLoading: boolean = false;
  isView: boolean = false;
  schemaFormGroup: FormGroup = new FormGroup({});
  subscriptions: Subscription = new Subscription();

  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private schemaService = inject(SchemaService);
  private configService = inject(ConfigService);

  constructor() {
    this.getSchemaTypes();
    this.addOpen();
    this.getColumns();
    this.getConnections();
  }

  addOpen(): void {
    this.schemaFormSidebarVisible = true;
    this.selectedSchema = {} as Database;
    this.schemaFormGroup = this.initSchemaForm();
  }
  initSchemaForm(): FormGroup {
    let formGroup = this.fb.group({
      type: [
        1,
        [Validators.required],
        [
          uniqueSchemaNameValidator(
            this.configService.http,
            this.configService.apiUrl,
            this.selectedSchema.uuid || this.isView ? true : false
          ),
        ],
      ],
      name: ['', [Validators.required, Validators.minLength(3)]],
      connectionPoolId: [null, [Validators.required]],
    });
    return formGroup;
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
    this.schemaFormSidebarVisible = false;
    this.schemaFormGroup.reset();
    this.schemaFormGroup.markAsUntouched();
    this.schemaFormGroup.markAsPristine();
    this.schemaFormGroup = this.initSchemaForm();
    if (!clearSelected) this.selectedSchema = {};
  }
  getSchemaTypes(): void {
    this.loading = true;
    this.subscriptions.add(
      this.schemaService.getSchemaTypes().subscribe({
        next: (data) => {
          this.loading = false;
          this.schemaTypes = data;
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

  fieldTypes: any[] = [];
  selectedColumn: Column = {} as Column;
  fullSchema: any[] = [];
  showColumnSelect: boolean = false;
  activeColumnExpand: number = -1;
  connections: any[] = [];
  createActions: MenuItem[] = [
    {
      label: 'Duplicate',
      icon: 'pi pi-plus',
      command: () => {
        this.duplicateColumn();
      },
    },
    {
      label: 'Delete',
      icon: 'pi pi-times',
      command: () => {
        this.deleteColumn();
      },
    },
  ];
  FIELD_TYPE = FIELD_TYPE;
  getColumns(): void {
    this.loading = true;
    this.subscriptions.add(
      this.schemaService.getColumns().subscribe({
        next: (data) => {
          this.loading = false;
          this.fieldTypes = data;
        },
        error: (error) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to Load Columns',
            detail: error.error.message,
          });
        },
      })
    );
  }
  getConnections(): void {
    this.loading = true;
    this.subscriptions.add(
      this.schemaService.getDatabasesKvp().subscribe({
        next: (data) => {
          this.loading = false;
          this.connections = data;
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
  addColumn() {
    this.selectedColumn = {} as Column;
    this.showColumnSelect = true;
  }
  cancelAddColumn() {
    this.showColumnSelect = false;
    this.selectedColumn = {} as Column;
  }
  columnTypeSelected() {
    this.selectedColumn.name = 'field ' + (this.fullSchema.length + 1);
    this.fullSchema.push(JSON.parse(JSON.stringify(this.selectedColumn)));
    this.showColumnSelect = false;
  }
  submitForm(): void {
    console.log(this.schemaFormGroup.value);
    console.log(this.fullSchema);
    this.loading = true;
    this.subscriptions.add(
      this.schemaService.getColumns().subscribe({
        next: (data) => {
          this.loading = false;
          this.fieldTypes = data;
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
  duplicateColumn() {
    let duplicate = JSON.parse(
      JSON.stringify(this.fullSchema[this.activeColumnExpand])
    );
    duplicate.name = 'field ' + (this.fullSchema.length + 1);
    this.fullSchema.push(duplicate);
  }
  activeIndexChanged(event: any) {
    this.activeColumnExpand = event;
  }
  deleteColumn() {
    this.fullSchema.splice(this.activeColumnExpand, 1);
  }

  preventDefault(event: any) {
    console.log(event);
    event.originalEvent.preventDefault();
  }
}
