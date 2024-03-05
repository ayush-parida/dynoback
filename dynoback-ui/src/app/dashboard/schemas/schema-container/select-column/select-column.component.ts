import { Component, Input } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-select-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './select-column.component.html',
  styleUrl: './select-column.component.scss',
})
export class SelectColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
}
