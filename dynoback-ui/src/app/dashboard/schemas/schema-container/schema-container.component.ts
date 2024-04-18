import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../shared/classes/shared.module';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService, ConfirmationService, MenuItem } from 'primeng/api';
import { Subscription } from 'rxjs';
import { Database } from '../../databases/helpers/database.interface';
import { SchemaService } from '../helpers/schema.service';
import { Column, Schema, SchemaType } from '../helpers/schema.interface';
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
import { SchemaDataComponent } from './schema-data/schema-data.component';
import { TabViewModule } from 'primeng/tabview';

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
    SchemaDataComponent,
    TabViewModule,
  ],
  templateUrl: './schema-container.component.html',
  styleUrl: './schema-container.component.scss',
})
export class SchemaContainerComponent {
  loading: boolean = false;
  selectedSchema: Schema = {} as Schema;
  schemas: Schema[] = [];
  schemaTypes: SchemaType[] = [];
  schemaFormSidebarVisible: boolean = false;
  apiPreviewSidebarVisible: boolean = false;
  schemaSidebarLoading: boolean = false;
  isView: boolean = false;
  activeIndex: number = 0;

  message401: any = {
    success: false,
    message: 'Invalid or expired token',
  };
  message404: any = {
    success: false,
    message: 'Record not found',
  };

  deleteMessage: any = {
    success: true,
    message: 'Record deleted successfully',
  };
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
      label: 'Delete Schema',
      icon: 'pi pi-trash',
      command: (event) => {
        this.deleteConfirmation(event);
      },
    },
    {
      label: 'API Preview',
      icon: 'pi pi-server',
      command: () => {
        this.addApiSidebar();
        this.getApiProperties();
      },
    },
  ];

  fieldTypes: any[] = [];
  selectedColumn: Column = {} as Column;
  fullSchema: any[] = [];
  showColumnSelect: boolean = false;
  activeColumnExpand: number = -1;
  connections: any[] = [];
  sidebarItems = ['Search/Pagination', 'Details', 'Create', 'Update', 'Delete'];
  selectedTab: string = this.sidebarItems[0];
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
    this.selectedSchema = {} as Schema;
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
        softDelete: [true],
      });
      formGroup.patchValue(values);
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
        softDelete: [true],
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
    if (!clearSelected) this.selectedSchema = {} as Schema;
  }

  getSchemas(uuid?: string): void {
    this.loading = true;
    this.subscriptions.add(
      this.schemaService.getSchemas().subscribe({
        next: (data) => {
          this.loading = false;
          this.schemas = data;
          if (uuid) {
            this.selectedSchema = this.schemas.filter((x) => x.uuid == uuid)
              .length
              ? this.schemas.filter((x) => x.uuid == uuid)[0]
              : ({} as Schema);
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
            this.getSchemas(this.selectedSchema.uuid);
            this.selectedSchema = {} as Schema;
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
            this.selectedSchema = {} as Schema;
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

  getApiProperties() {
    console.log(this.selectedSchema);
  }

  addApiSidebar(): void {
    this.apiPreviewSidebarVisible = true;
  }

  confirmCloseApiPreview() {
    this.apiPreviewSidebarVisible = false;
  }
  selectTab(item: string, index: number) {
    this.activeIndex = index;
    this.selectedTab = item;
  }
  // onTabChange(event: any) {
  //   this.selectedTab = event.index;
  // }

  generateSampleRecord(schema: Schema): any {
    let sampleRecord: any = {
      // System fields
      uuid: '123e4567-e89b-12d3-a456-426614174000', // Example UUID, generate as needed
      created: new Date().toISOString(),
      created_by: '6e4865f0-7b0f-44b1-b3cd-9d76863aecec', // Assuming a system user, adjust as needed
      updated: new Date().toISOString(),
      updated_by: '6e4865f0-7b0f-44b1-b3cd-9d76863aecec', // Assuming a system user, adjust as needed
      is_active: true, // Assuming new records are active by default
    };

    return { ...sampleRecord, ...this.generateSampleRequest(schema) };
  }
  generateSampleRequest(schema: Schema) {
    let sampleRecord: any = {};
    schema.schema.forEach((field) => {
      switch (
        field.id // Using field.id to determine the type
      ) {
        case FIELD_TYPE.TEXT:
        case FIELD_TYPE.EDITOR: // Assuming similar handling for TEXT and EDITOR
          sampleRecord[field.name.replace(/\s+/g, '_')] =
            field.id === FIELD_TYPE.TEXT
              ? 'Sample Text'
              : '<p>Sample HTML content</p>';
          break;
        case FIELD_TYPE.NUMBER:
          const minNumber = field.options?.min || 0;
          const maxNumber = field.options?.max || 100;
          sampleRecord[field.name.replace(/\s+/g, '_')] =
            Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
          break;
        case FIELD_TYPE.BOOL:
          sampleRecord[field.name.replace(/\s+/g, '_')] = true;
          break;
        case FIELD_TYPE.EMAIL:
          sampleRecord[field.name.replace(/\s+/g, '_')] = 'sample@gmail.com';
          break;
        case FIELD_TYPE.URL:
          sampleRecord[field.name.replace(/\s+/g, '_')] =
            'http://www.example.com';
          break;
        case FIELD_TYPE.DATE:
          sampleRecord[field.name.replace(/\s+/g, '_')] =
            new Date().toISOString();
          break;
        case FIELD_TYPE.SELECT:
          // Assuming options is an array of { label: string; value: any; }
          // Picking the first option as the sample, adjust as necessary
          const firstOption = field.options.values
            ? field.options.values[0]
            : 'Option 1';
          sampleRecord[field.name.replace(/\s+/g, '_')] = [firstOption];
          break;
        case FIELD_TYPE.FILE:
          // Simulating a file with a basic object, adjust according to your file handling
          sampleRecord[field.name.replace(/\s+/g, '_')] = {
            name: 'sample.txt',
            url: 'http://example.com/sample.txt',
          };
          break;
        case FIELD_TYPE.JSON:
          // Providing a simple JSON object as an example
          sampleRecord[field.name.replace(/\s+/g, '_')] = JSON.stringify({
            key: 'value',
          });
          break;
        case FIELD_TYPE.RELATION:
          // Assuming a simple relation to another entity, represented by an ID
          // You might want to adjust this based on how your relations are structured
          sampleRecord[field.name.replace(/\s+/g, '_')] =
            'relatedEntityUuid123';
          break;
        // Add default case or other field types if necessary
        // Add cases for SELECT, FILE, JSON, RELATION as needed
        default:
          sampleRecord[field.name.replace(/\s+/g, '_')] =
            'Unsupported field type';
      }
    });
    return sampleRecord;
  }
  generatePaginationSampleRecord(schema: Schema) {
    return {
      ...{
        pagination: {
          current_page: 1,
          per_page: 10,
          total_pages: 1,
          sort_by: 'uuid',
          sort_order: 'ASC',
          total: 2,
        },
      },
      ...{
        records: [
          this.generateSampleRecord(schema),
          this.generateSampleRecord(schema),
        ],
      },
    };
  }
  getCreateSuccessSampleResponse(schema: Schema) {
    return {
      ...{ success: true, message: 'Record Created' },
      ...{ record: this.generateSampleRecord(schema) },
    };
  }
  getUpdateSuccessSampleResponse(schema: Schema) {
    return {
      ...{ success: true, message: 'Record Updated' },
      ...{ record: this.generateSampleRecord(schema) },
    };
  }
}
