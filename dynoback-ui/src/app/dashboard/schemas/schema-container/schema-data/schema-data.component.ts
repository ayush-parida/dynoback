import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { DataService } from '../../helpers/data.service';
import { LazyLoadEvent, MessageService } from 'primeng/api';
import { Pagination, Schema } from '../../helpers/schema.interface';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
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
  pagination: Pagination = {
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
    sort_by: '',
    sort_order: 'asc',
  };
  jsonEditorOptions: JsonEditorOptions = new JsonEditorOptions();

  FIELD_TYPE = FIELD_TYPE;
  subscriptions: Subscription = new Subscription();

  @Input() schema: Schema = {} as Schema;

  private dataService = inject(DataService);
  private messageService = inject(MessageService);
  private formBuilder = inject(FormBuilder);

  constructor() {}
  ngOnChanges(changes: SimpleChanges): void {
    this.reset();
    this.fetchEntries();
    this.setupColumns();
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
          this.schema.name,
          current_page,
          per_page,
          sort_by,
          sort_order,
          this.searchFilter,
          this.selectedFields.map((x) => this.getFieldName(x.name))
        )
        .subscribe({
          next: (data: any) => {
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
      } else {
        this.form.addControl(
          this.getFieldName(col.name),
          this.formBuilder.control(col.default || '', validators)
        );
      }
    }
  }

  openNew() {
    this.entry = {};
    this.entryDialog = true;
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
        if (col.options.maxSelect == 1) {
          customEntry = {
            ...customEntry,
            ...{
              [this.getFieldName(col.name)]: entry[this.getFieldName(col.name)],
            },
          };
        } else {
          customEntry = {
            ...customEntry,
            ...{
              [this.getFieldName(col.name)]:
                entry[this.getFieldName(col.name)].split(','),
            },
          };
        }
      } else {
        customEntry = {
          ...customEntry,
          ...{
            [this.getFieldName(col.name)]: entry[this.getFieldName(col.name)],
          },
        };
      }
    }
    this.entry = { ...customEntry, ...{ uuid: entry.uuid } };
    this.entryDialog = true;
    this.form.patchValue(this.entry);
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
}
