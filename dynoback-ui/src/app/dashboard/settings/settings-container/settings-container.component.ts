import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/classes/shared.module';
import { SidebarModule } from 'primeng/sidebar';
import { HeaderComponent } from '../../header/header.component';

@Component({
  selector: 'app-settings-container',
  standalone: true,
  imports: [SharedModule, SidebarModule],
  templateUrl: './settings-container.component.html',
  styleUrl: './settings-container.component.scss',
})
export class SettingsContainerComponent {
  items: any[] = [
    {
      label: 'Application',
      route: ['/settings'],
    },
    {
      label: 'Admin Management',
      route: ['/settings/admins'],
    },
  ];
}
