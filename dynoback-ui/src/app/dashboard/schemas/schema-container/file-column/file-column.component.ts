import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-file-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './file-column.component.html',
  styleUrl: './file-column.component.scss',
})
export class FileColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
  @Output()
  customIndexChangeEmit = new EventEmitter<boolean>();
  selectedChange(event: any) {
    this.customIndexChangeEmit.emit(true);
  }
}
