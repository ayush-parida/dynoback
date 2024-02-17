import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
})
export class SpinnerComponent {
  @Input()
  loading: boolean = false;
  @Input()
  type: 'full' | 'contain' = 'contain';
}
