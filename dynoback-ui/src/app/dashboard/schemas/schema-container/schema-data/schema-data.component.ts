import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { Location } from '@angular/common';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { DataService } from '../../helpers/data.service';
import { MessageService } from 'primeng/api';
import { Pagination, Schema } from '../../helpers/schema.interface';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormControl,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { FIELD_TYPE } from '../../helpers/schema.enum';
import * as FileSaver from 'file-saver';
import {
  emailDomainValidator,
  urlDomainValidator,
  dateRangeValidator,
  selectFieldValueValidator,
} from '../../helpers/schema.validator';
import { JsonEditorOptions, NgJsonEditorModule } from 'ang-jsoneditor';
import { SchemaService } from '../../helpers/schema.service';
import { authUniqueValidator } from '../../../../shared/classes/auth-unique.validator';
import { ConfigService } from '../../../../shared/services/config.service';

@Component({
  selector: 'app-schema-data',
  standalone: true,
  imports: [SharedModule, NgJsonEditorModule],
  templateUrl: './schema-data.component.html',
  styleUrl: './schema-data.component.scss',
})
export class SchemaDataComponent implements OnChanges {
  entries: any[] = [];
  dynamicColumns: any[] = [];
  selectedEntries: any[] = [];
  entryDialog: boolean = false;
  entry: any = {}; // For storing an entry during edit
  form: FormGroup = new FormGroup({});
  displayDialog: boolean = false;
  loading: boolean = false;
  searchFilter: string = '';
  selectedFields: any[] = [];
  relationModal: boolean = false;
  pagination: Pagination = {
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
    sort_by: '',
    sort_order: 'asc',
  };
  relationPagination: Pagination = {
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
    sort_by: '',
    sort_order: 'asc',
  };
  relationEntries: any[] = [];
  isEdit: boolean = false;
  jsonEditorOptions: JsonEditorOptions = new JsonEditorOptions();

  FIELD_TYPE = FIELD_TYPE;
  subscriptions: Subscription = new Subscription();

  @Input() schema: Schema = {} as Schema;

  private dataService = inject(DataService);
  private messageService = inject(MessageService);
  private formBuilder = inject(FormBuilder);
  private schemaService = inject(SchemaService);
  private configService = inject(ConfigService);
  private location = inject(Location);
  relation: Schema = {} as Schema;

  constructor() {}
  ngOnChanges(changes: SimpleChanges): void {
    this.reset();
    this.setupColumns();
    this.fetchEntries();
    this.setJsonEditorProps();
  }
  setJsonEditorProps() {
    this.jsonEditorOptions.mode = 'code';
    this.jsonEditorOptions.mainMenuBar = true;
    this.jsonEditorOptions.modes = ['code', 'text', 'tree', 'view'];
    this.jsonEditorOptions.navigationBar = true;
    this.jsonEditorOptions.enableSort = true;
    this.jsonEditorOptions.enableTransform = true;
    this.jsonEditorOptions.search = true;
    this.jsonEditorOptions.statusBar = true;
    this.jsonEditorOptions.history = true;
    this.jsonEditorOptions.sortObjectKeys = true;
  }
  reset() {
    this.searchFilter = '';
    this.selectedFields = [];
    this.loading = false;
    this.displayDialog = false;
    this.entries = [];
    this.dynamicColumns = [];
    this.entryDialog = false;
    this.selectedEntries = [];
  }
  fetchEntries() {
    const { current_page, per_page, sort_by, sort_order } = this.pagination;
    this.loading = true;
    this.entries = [];
    this.subscriptions.add(
      this.dataService
        .getEntries(
          this.schema,
          current_page,
          per_page,
          sort_by,
          sort_order,
          this.searchFilter,
          this.selectedFields.map((x) => this.getFieldName(x.name))
        )
        .subscribe({
          next: (data) => {
            this.loading = false;
            this.entries = data.records; // Assuming the response has the entries
            this.pagination = data.pagination; // Total number of records, for pagination
          },
          error: (error) => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Operation Failed',
              detail: error.error.message,
            });
          },
        })
    );
  }

  loadEntriesLazy(event: any) {
    // Process filters to match the expected backend format
    const processedFilters: any = {};
    Object.keys(event.filters).forEach((field: any) => {
      processedFilters[field] = event.filters[field].map((filter: any) => ({
        value: filter.value,
        matchMode: filter.matchMode,
        operator: filter.operator,
      }));
    });
    // Serialize filters to a JSON string
    const filterParam = JSON.stringify(processedFilters);
    this.searchFilter = filterParam;
    // Fetch entries with updated parameters
    this.fetchEntries();
  }

  setupColumns() {
    this.dynamicColumns = this.schema.schema;

    this.selectedFields = this.dynamicColumns;
    this.form = this.formBuilder.group({});
    for (const col of this.dynamicColumns) {
      const validators = [];
      if (col.required) {
        validators.push(Validators.required);
      }
      switch (col.id) {
        case FIELD_TYPE.TEXT:
        case FIELD_TYPE.EDITOR: // Assuming similar validation requirements for TEXT and EDITOR
          if (col.options.min) {
            validators.push(Validators.minLength(col.options.min));
          }
          if (col.options.max) {
            validators.push(Validators.maxLength(col.options.max));
          }
          if (col.options.pattern) {
            validators.push(Validators.pattern(col.options.pattern));
          }
          break;
        case FIELD_TYPE.NUMBER:
          if (col.options.min !== undefined) {
            // Check explicitly for undefined to allow zero
            validators.push(Validators.min(col.options.min));
          }
          if (col.options.max !== undefined) {
            validators.push(Validators.max(col.options.max));
          }
          break;
        case FIELD_TYPE.EMAIL:
          validators.push(Validators.email);
          // Custom validators for domain-specific validation can be added here
          if (col.options.allowedDomains) {
            validators.push(emailDomainValidator(col.options.allowedDomains));
          }
          break;
        case FIELD_TYPE.URL:
          validators.push(Validators.pattern(/https?:\/\/.*/)); // Simplistic URL validation pattern
          // Additional or more complex URL validation logic can be implemented with custom validators
          if (col.options.allowedDomains) {
            validators.push(urlDomainValidator(col.options.allowedDomains));
          }
          break;
        case FIELD_TYPE.DATE:
          // Custom validators for min/max date validation would be required
          if (col.options.minDate || col.options.maxDate) {
            validators.push(
              dateRangeValidator(col.options.minDate, col.options.maxDate)
            );
          }
          break;
        case FIELD_TYPE.SELECT:
          // Assuming validation is needed to ensure the selected value is within the provided options
          // This would likely require a custom validator
          if (col.options.allowedValues) {
            validators.push(
              selectFieldValueValidator(col.options.allowedValues)
            );
          }
          break;
        // Implement additional cases as necessary, such as FILE, JSON, RELATION, etc.
      }
      if (col.id == FIELD_TYPE.JSON) {
        this.form.addControl(
          this.getFieldName(col.name),
          this.formBuilder.control(col.default ? col.default : {}, validators)
        );
      } else if (col.id == FIELD_TYPE.RELATION) {
        this.form.addControl(
          this.getFieldName(col.name),
          this.formBuilder.control(col.default || '', validators)
        );
      } else {
        this.form.addControl(
          this.getFieldName(col.name),
          this.formBuilder.control(col.default || '', validators)
        );
      }

      if (this.schema.type == 2) {
        this.form.addControl(
          'email',
          new FormControl(col.default || '', {
            validators: [Validators.required, Validators.email],
            asyncValidators: [
              authUniqueValidator(
                this.configService.http,
                this.configService.apiUrl,
                this.schema.name,
                'unique_email',
                this.isEdit
              ),
            ],
            updateOn: 'change',
          })
        );
        this.form.addControl(
          'username',
          new FormControl(col.default || '', {
            validators: [Validators.required],
            asyncValidators: [
              authUniqueValidator(
                this.configService.http,
                this.configService.apiUrl,
                this.schema.name,
                'unique_username',
                this.isEdit
              ),
            ],
            updateOn: 'change',
          })
        );
        if (!this.isEdit) {
          this.form.addControl(
            'password',
            new FormControl(col.default || '', {
              validators: [Validators.required, Validators.minLength(6)],
            })
          );
        }
        this.form.addControl('verified', new FormControl(false));
        this.form.addControl('show_email', new FormControl(true));
      }
    }
  }

  openNew() {
    this.isEdit = false;
    this.setupColumns();
    this.entry = {};
    this.entryDialog = true;
    this.form.get('verified')?.disable();
    this.form.get('show_email')?.disable();
  }

  deleteSelectedEntries() {
    // Implement deletion logic here
    // For example, call your data service to delete entries, then fetch the updated list
    this.fetchEntries(); // Refresh the entries list after deletion
    this.messageService.add({
      severity: 'success',
      summary: 'Successful',
      detail: 'Entries Deleted',
      life: 3000,
    });
  }

  editEntry(entry: any) {
    var customEntry = {};
    this.isEdit = true;
    for (const col of this.dynamicColumns) {
      if (col.id == FIELD_TYPE.DATE) {
        customEntry = {
          ...customEntry,
          ...{
            [this.getFieldName(col.name)]: new Date(
              entry[this.getFieldName(col.name)]
            ),
          },
        };
      } else if (col.id == FIELD_TYPE.SELECT) {
        // if (col.options.maxSelect == 1) {
        //   customEntry = {
        //     ...customEntry,
        //     ...{
        //       [this.getFieldName(col.name)]: entry[this.getFieldName(col.name)],
        //     },
        //   };
        // } else {
        customEntry = {
          ...customEntry,
          ...{
            [this.getFieldName(col.name)]: entry[this.getFieldName(col.name)],
          },
        };
        // }
      } else {
        customEntry = {
          ...customEntry,
          ...{
            [this.getFieldName(col.name)]: entry[this.getFieldName(col.name)],
          },
        };
      }
    }
    this.entry = { ...customEntry, ...entry };
    this.entryDialog = true;
    this.setupColumns();
    this.form.patchValue(this.entry);
    this.form.get('verified')?.disable();
    this.form.get('show_email')?.disable();
    this.form.get('email')?.disable();
  }
  deleteEntry(entry: any) {
    this.loading = true;
    this.dataService.deleteEntry(this.schema.name, entry.uuid).subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data.success) {
          this.messageService.add({
            severity: 'success',
            summary: data.message,
            detail: data.message,
          });
          // After save or update, fetch the updated entries list and close the dialog
          // Similar to deleteSelectedEntries but for a single entry
          this.fetchEntries(); // Refresh entries list
        } else
          this.messageService.add({
            severity: 'error',
            summary: 'Operation Failed',
            detail: 'Some Error Occurred',
          });
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Operation Failed',
          detail: error.error.message,
        });
      },
    });
  }

  hideDialog() {
    this.entry = {};
    this.entryDialog = false;
    this.form.reset(); // Reset form on dialog close
  }

  saveEntry() {
    console.log(this.form);
    console.log(this.form.valid);
    // Assuming form validation is handled
    if (this.form.valid) {
      var formData = JSON.parse(JSON.stringify(this.form.value));
      this.dynamicColumns.forEach((col) => {
        if (col.id == FIELD_TYPE.JSON) {
          formData[col.name] = JSON.stringify(formData[col.name]);
        }
      });
      this.loading = true;
      let requestObservable;
      if (this.entry?.uuid) {
        requestObservable = this.dataService.putEntry(
          this.schema.name,
          this.entry.uuid,
          {
            ...this.entry,
            ...formData,
          }
        );
      } else {
        requestObservable = this.dataService.postEntry(
          this.schema.name,
          formData
        );
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
              // After save or update, fetch the updated entries list and close the dialog
              this.fetchEntries();
              this.entryDialog = false;
              this.form.reset();
            } else
              this.messageService.add({
                severity: 'error',
                summary: 'Operation Failed',
                detail: 'Some Error Occurred',
              });
          },
          error: (error) => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Operation Failed',
              detail: error.error.message,
            });
          },
        })
      );
    }
  }
  onPageChange(event: any) {
    this.pagination.current_page = event.first / event.rows + 1;
    this.pagination.per_page = event.rows;
    this.fetchEntries();
  }
  getFieldName(name: string): string {
    return name.replace(/ /g, '_');
  }
  filterGlobal() {
    console.log(this.searchFilter);
  }
  onSort(event: any) {
    this.pagination.sort_by = event.field;
    this.pagination.sort_order = event.order === 1 ? 'asc' : 'desc';
    this.fetchEntries();
  }
  exportPdf() {
    import('jspdf').then((jsPDF) => {
      import('jspdf-autotable').then((x) => {
        const doc = new jsPDF.default('p', 'px', 'a4');
        (doc as any).autoTable(this.selectedFields, this.entries);
        doc.save('products.pdf');
      });
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.entries);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
      this.saveAsExcelFile(excelBuffer, 'products');
    });
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE,
    });
    FileSaver.saveAs(
      data,
      fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION
    );
  }
  copyContent(val: string) {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
    this.messageService.add({
      severity: 'success',
      summary: 'Successful',
      detail: 'Copied ' + val,
      life: 3000,
    });
  }
  dynamicColumnChange() {
    this.fetchEntries();
  }
  clearRelation(name: string) {
    this.form.patchValue({ [name]: '' });
  }
  openRelationModal(col: any) {
    this.schemaService
      .getSchemaDetails(col.options.relatedTableUuid)
      .subscribe({
        next: (response) => {
          this.relation = response;

          this.getRelationEntries();
        },
        error: (error) => {},
      });
    this.relationModal = true;
  }
  getRelationEntries() {
    const { current_page, per_page, sort_by, sort_order } =
      this.relationPagination;
    this.dataService
      .getEntries(this.relation, current_page, per_page, sort_by, sort_order)
      .subscribe({
        next: (res) => {
          this.relationEntries = res.records;
          this.relationPagination = res.pagination;
        },
        error: (err) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Operation Failed',
            detail: err.error.message,
          });
        },
      });
  }
  onRelationPageChange(event: any) {
    this.relationPagination.current_page = event.first / event.rows + 1;
    this.relationPagination.per_page = event.rows;
    this.getRelationEntries();
  }
  verifyAuthEntry() {
    this.loading = true;
    this.schemaService
      .getAuthToken(this.schema.uuid, this.entry.uuid)
      .subscribe({
        next: (res) => {
          this.loading = false;
          const token = res.token;
          if (token) {
            const path = '/verify';
            const queryParams = `?schema=${encodeURIComponent(
              this.schema.name
            )}&token=${encodeURIComponent(token)}`;
            const fullPath = this.location.prepareExternalUrl(
              path + queryParams
            );
            window.open(fullPath, '_blank');
            this.loading = true;
            setTimeout(() => {
              this.getEntryDetails();
              this.loading = false;
            }, 5000);
          }
        },
        error: (err) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Operation Failed',
            detail: err.error.message,
          });
        },
      });
  }
  getEntryDetails() {
    this.loading = true;
    this.dataService
      .getEntryDetails(this.schema.name, this.entry.uuid)
      .subscribe({
        next: (data: any) => {
          this.loading = false;
          this.messageService.add({
            severity: 'success',
            summary: data.message,
            detail: data.message,
          });
          this.editEntry(this.entry);
        },
        error: (error) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Operation Failed',
            detail: error.error.message,
          });
        },
      });
  }
}
