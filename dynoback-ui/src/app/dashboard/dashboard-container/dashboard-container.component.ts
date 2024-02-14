import { Component, inject } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { SharedModule } from '../../shared/classes/shared.module';
import { HeaderComponent } from '../header/header.component';
import { MainSidebarComponent } from '../main-sidebar/main-sidebar.component';

@Component({
  selector: 'app-dashboard-container',
  standalone: true,
  imports: [SharedModule, HeaderComponent, MainSidebarComponent],
  templateUrl: './dashboard-container.component.html',
  styleUrl: './dashboard-container.component.scss',
})
export class DashboardContainerComponent {
  auth = inject(AuthService);
}
