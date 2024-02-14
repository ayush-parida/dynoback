import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { authGuard } from './shared/auth.guard';
export const routes: Routes = [
  // { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'admin',
    component: AppComponent,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./login/login.component').then((c) => c.LoginComponent),
      },
      {
        path: 'databases',
        loadComponent: () =>
          import(
            './dashboard/dashboard-container/dashboard-container.component'
          ).then((c) => c.DashboardContainerComponent),
        canActivate: [authGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import(
                './dashboard/databases/databases-container/databases-container.component'
              ).then((c) => c.DatabasesContainerComponent),
            canActivate: [authGuard],
          },
        ],
      },
      {
        path: '',
        loadComponent: () =>
          import(
            './dashboard/dashboard-container/dashboard-container.component'
          ).then((c) => c.DashboardContainerComponent),
        canActivate: [authGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import(
                './dashboard/databases/databases-container/databases-container.component'
              ).then((c) => c.DatabasesContainerComponent),
            canActivate: [authGuard],
          },
          {
            path: 'settings',
            loadComponent: () =>
              import(
                './dashboard/settings/settings-container/settings-container.component'
              ).then((c) => c.SettingsContainerComponent),
            canActivate: [authGuard],
            children: [
              {
                path: 'admins',
                loadComponent: () =>
                  import(
                    './dashboard/settings/admin-management/admin-management.component'
                  ).then((c) => c.AdminManagementComponent),
                canActivate: [authGuard],
              },
            ],
          },
        ],
      },
    ],
  },
];
