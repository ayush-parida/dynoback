import { Component, Input } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-json-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './json-column.component.html',
  styleUrl: './json-column.component.scss',
})
export class JsonColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
}
