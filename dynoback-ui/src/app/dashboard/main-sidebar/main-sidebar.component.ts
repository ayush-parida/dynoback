import { Component, inject } from '@angular/core';
import { SharedModule } from '../../shared/classes/shared.module';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-main-sidebar',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './main-sidebar.component.html',
  styleUrl: './main-sidebar.component.scss',
})
export class MainSidebarComponent {
  private authService = inject(AuthService);
  items: any[] = [
    {
      label: 'Databases',
      icon: 'pi-database',
      route: ['/admin/databases'],
    },
    {
      label: 'Schemas',
      icon: 'pi-table',
      route: ['/admin/schemas'],
    },
    {
      label: 'Settings',
      icon: 'pi-cog',
      route: ['/admin/settings'],
    },
  ];
  logout() {
    this.authService.logout();
  }
}
