import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-number-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './number-column.component.html',
  styleUrl: './number-column.component.scss',
})
export class NumberColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
}
