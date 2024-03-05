import { Component, Input } from '@angular/core';
import { SharedModule } from '../../../../shared/classes/shared.module';
import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-relation-column',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './relation-column.component.html',
  styleUrl: './relation-column.component.scss',
})
export class RelationColumnComponent {
  @Input()
  column: any;
  @Input()
  createActions: MenuItem[] = [];
}
