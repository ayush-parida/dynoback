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
  connectionPoolId: string = '';
  subscriptions: Subscription = new Subscription();
  menubarItems: MenuItem[] = [
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      command: (event) => {
        this.editOpen();
      },
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: (event) => {
        this.deleteConfirmation(event);
      },
    },
  ];
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private schemaService = inject(SchemaService);
  private configService = inject(ConfigService);

  constructor() {
    this.getSchemaTypes();
    this.getColumns();
    this.getConnections(true);
    this.getSchemas();
  }

  addOpen(): void {
    this.schemaFormSidebarVisible = true;
    this.selectedSchema = {} as Database;
    this.fullSchema = [];
    this.schemaFormGroup = this.initSchemaForm();
  }
  editOpen(): void {
    this.schemaFormSidebarVisible = true;
    this.getSchemaDetails();
  }
  getSchemaDetails() {
    this.loading = true;
    this.subscriptions.add(
      this.schemaService.getSchemaDetails(this.selectedSchema.uuid).subscribe({
        next: (data: any) => {
          this.loading = false;
          this.schemaFormGroup = this.initSchemaForm(false, data);
          this.fullSchema = data.schema;
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
  initSchemaForm(reset: boolean = true, values?: any): FormGroup {
    if (!reset) {
      let formGroup = this.fb.group({
        type: [1, [Validators.required]],
        name: [
          { value: '', disabled: true },
          [
            Validators.required,
            Validators.minLength(3),
            Validators.pattern(/^[a-z_]*$/),
          ],
        ],
        connectionPoolId: [null, [Validators.required]],
      });
      console.log(this.selectedSchema.schema);
      formGroup.patchValue(values);
      console.log(formGroup.value);
      return formGroup;
    } else {
      let formGroup = this.fb.group({
        type: [1, [Validators.required]],
        name: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.pattern(/^[a-z_]*$/),
          ],
          [
            uniqueSchemaNameValidator(
              this.configService.http,
              this.configService.apiUrl,
              this.selectedSchema.uuid || this.isView ? true : false
            ),
          ],
        ],
        connectionPoolId: [null, [Validators.required]],
      });
      return formGroup;
    }
  }
  confirmClose(event: any) {
    if (!this.selectedSchema?.uuid)
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
    else this.closeFormSidebar(true);
  }
  private closeFormSidebar(clearSelected?: boolean) {
    this.schemaFormSidebarVisible = false;
    this.schemaFormGroup.reset();
    this.schemaFormGroup.markAsUntouched();
    this.schemaFormGroup.markAsPristine();
    this.schemaFormGroup = this.initSchemaForm();
    if (!clearSelected) this.selectedSchema = {};
  }

  getSchemas(): void {
    this.loading = true;
    this.subscriptions.add(
      this.schemaService.getSchemas().subscribe({
        next: (data) => {
          this.loading = false;
          this.schemas = data;
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
  getConnections(testConnection: boolean): void {
    this.loading = true;
    this.subscriptions.add(
      this.schemaService.getDatabasesKvp().subscribe({
        next: (data) => {
          this.loading = false;
          this.connections = data;
          if (this.connections.length) {
            this.connectionPoolId = this.connections[0].uuid;
            if (testConnection) {
              this.testConnection();
            }
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
  testConnection(): void {
    this.loading = true;
    this.subscriptions.add(
      this.schemaService
        .databaseConnectionTest(this.connectionPoolId)
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
              this.connections.filter((x) => x.uuid == this.connectionPoolId)
                .length
                ? (this.connections.filter(
                    (x) => x.uuid == this.connectionPoolId
                  )[0].disabled = true)
                : '';
              if (this.connectionPoolId != this.connections[0].uuid)
                this.connectionPoolId = this.connections[0].uuid;
              else this.connectionPoolId = '';
            }
          },
          error: (error) => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error! Failed!',
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
    this.loading = true;
    let requestObservable;
    if (this.selectedSchema?.uuid) {
      requestObservable = this.schemaService.putSchema(
        this.selectedSchema.uuid,
        {
          ...this.schemaFormGroup.value,
          ...{ schema: this.fullSchema },
        }
      );
    } else {
      requestObservable = this.schemaService.postSchema({
        ...this.schemaFormGroup.value,
        ...{ schema: this.fullSchema },
      });
    }
    this.subscriptions.add(
      requestObservable.subscribe({
        next: (data: any) => {
          this.loading = false;
          if (data.success) {
            this.messageService.add({
              severity: 'success',
              summary: data.message,
              detail: data.message,
            });
            this.schemaFormSidebarVisible = false;
            this.getSchemas();
          } else
            this.messageService.add({
              severity: 'error',
              summary: 'Failed to Update Schema',
              detail: 'Some Error Occurred',
            });
        },
        error: (error) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to Update Schema',
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
    console.log(event);
    this.activeColumnExpand = event;
  }
  deleteColumn() {
    this.fullSchema.splice(this.activeColumnExpand, 1);
  }

  preventDefault(event: any) {
    console.log(event);
    event.originalEvent.preventDefault();
  }
  deleteConfirmation(event: any) {
    if (this.selectedSchema?.uuid)
      this.confirmationService.confirm({
        target: event.target as EventTarget,
        message:
          'Are you sure that you want to delete schema?\nThis action is irreversible!',
        header: 'Delete Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptIcon: 'none',
        rejectIcon: 'none',
        acceptButtonStyleClass: 'p-button-danger p-button-text',
        rejectButtonStyleClass: 'p-button-text p-button-text',
        accept: () => {
          this.deleteSchema();
        },
        reject: () => {},
      });
  }
  deleteSchema(): void {
    this.subscriptions.add(
      this.schemaService.deleteSchema(this.selectedSchema.uuid).subscribe({
        next: (data: any) => {
          this.loading = false;
          if (data.success) {
            this.messageService.add({
              severity: 'success',
              summary: data.message,
              detail: data.message,
            });
            this.schemaFormSidebarVisible = false;
            this.selectedSchema = {};
            this.getSchemas();
          } else
            this.messageService.add({
              severity: 'error',
              summary: 'Failed to Update Schema',
              detail: 'Some Error Occurred',
            });
        },
        error: (error) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to Update Schema',
            detail: error.error.message,
          });
        },
      })
    );
  }
}
