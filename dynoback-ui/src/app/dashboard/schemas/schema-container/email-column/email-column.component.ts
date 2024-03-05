import { Component, Input } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-email-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './email-column.component.html',
  styleUrl: './email-column.component.scss',
})
export class EmailColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
}
