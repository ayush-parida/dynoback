import { Component, Input } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-text-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './text-column.component.html',
  styleUrl: './text-column.component.scss',
})
export class TextColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
}
