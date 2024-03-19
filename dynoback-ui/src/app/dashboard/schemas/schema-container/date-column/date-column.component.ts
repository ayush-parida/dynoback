import { Component, Input } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-date-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './date-column.component.html',
  styleUrl: './date-column.component.scss',
})
export class DateColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
}
