import { Component, Input } from '@angular/core';
import { SharedModule } from '../../shared/classes/shared.module';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  currentTime = new Date();
  @Input()
  menubarItems: MenuItem[] = [];
}
