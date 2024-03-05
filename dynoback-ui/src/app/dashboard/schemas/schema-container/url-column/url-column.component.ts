import { Component, Input } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-url-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './url-column.component.html',
  styleUrl: './url-column.component.scss',
})
export class UrlColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
}
