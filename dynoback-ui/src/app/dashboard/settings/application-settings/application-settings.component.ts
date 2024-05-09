import { Component } from '@angular/core';
import { ChipsModule } from 'primeng/chips';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/classes/shared.module';

@Component({
  selector: 'app-application-settings',
  standalone: true,
  imports: [
    InputTextModule,
    ChipsModule,
    CardModule,
    ButtonModule,
    CommonModule,
    SharedModule,
  ],
  templateUrl: './application-settings.component.html',
  styleUrl: './application-settings.component.scss',
})
export class ApplicationSettingsComponent {
  ip: string = '0.0.0.0';
  appName: string = 'GDP';
  adminTokenExpiry: number = 360000;
  origin = [
    'http://127.0.0.1:4200',
    'http://0.0.0.0:4200',
    'http://localhost:4200',
    'None',
    'null',
  ];
}
