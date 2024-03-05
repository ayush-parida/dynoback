import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { SharedModule } from '../../../../shared/classes/shared.module';

@Component({
  selector: 'app-bool-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './bool-column.component.html',
  styleUrl: './bool-column.component.scss',
})
export class BoolColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
}
