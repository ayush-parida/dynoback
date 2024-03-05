import { Component, Input } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-editor-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './editor-column.component.html',
  styleUrl: './editor-column.component.scss',
})
export class EditorColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
}
