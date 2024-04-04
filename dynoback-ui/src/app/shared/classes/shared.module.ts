import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { HttpClientModule } from '@angular/common/http';
import { HeaderComponent } from '../../dashboard/header/header.component';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ButtonModule } from 'primeng/button';
import { MessagesModule } from 'primeng/messages';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DockModule } from 'primeng/dock';
import { MenubarModule } from 'primeng/menubar';
import { MegaMenuModule } from 'primeng/megamenu';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { DropdownModule } from 'primeng/dropdown';
import { SidebarModule } from 'primeng/sidebar';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { PanelModule } from 'primeng/panel';
import { PasswordModule } from 'primeng/password';
import { FieldsetModule } from 'primeng/fieldset';
import { InputSwitchModule } from 'primeng/inputswitch';
import { SpinnerComponent } from '../components/spinner/spinner.component';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { EditorModule } from 'primeng/editor';
import { ChipsModule } from 'primeng/chips';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { EllipsisPipe } from './ellipsis.pipe';
import { JsonEllipsisPipe } from './josn-ellipsis.pipe';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    HeaderComponent,
    SpinnerComponent,
    CardModule,
    CheckboxModule,
    InputTextModule,
    InputMaskModule,
    InputGroupModule,
    InputGroupAddonModule,
    ButtonModule,
    MessagesModule,
    ToastModule,
    DockModule,
    MenubarModule,
    MegaMenuModule,
    MenuModule,
    AvatarModule,
    DividerModule,
    AccordionModule,
    TableModule,
    PaginatorModule,
    DropdownModule,
    SidebarModule,
    ConfirmPopupModule,
    ConfirmDialogModule,
    TooltipModule,
    PanelModule,
    ScrollPanelModule,
    PasswordModule,
    FieldsetModule,
    InputSwitchModule,
    ChipModule,
    BadgeModule,
    InputNumberModule,
    CalendarModule,
    EditorModule,
    ChipsModule,
    ToolbarModule,
    DialogModule,
    InputTextareaModule,
    MultiSelectModule,
    EllipsisPipe,
    JsonEllipsisPipe,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    HeaderComponent,
    SpinnerComponent,
    CardModule,
    CheckboxModule,
    InputTextModule,
    InputMaskModule,
    InputGroupModule,
    InputGroupAddonModule,
    ButtonModule,
    MessagesModule,
    ToastModule,
    DockModule,
    MenubarModule,
    MegaMenuModule,
    MenuModule,
    AvatarModule,
    DividerModule,
    AccordionModule,
    TableModule,
    PaginatorModule,
    DropdownModule,
    SidebarModule,
    ConfirmPopupModule,
    ConfirmDialogModule,
    TooltipModule,
    PanelModule,
    ScrollPanelModule,
    PasswordModule,
    FieldsetModule,
    InputSwitchModule,
    ChipModule,
    BadgeModule,
    InputNumberModule,
    CalendarModule,
    EditorModule,
    ChipsModule,
    ToolbarModule,
    DialogModule,
    InputTextareaModule,
    MultiSelectModule,
    EllipsisPipe,
    JsonEllipsisPipe,
  ],
  providers: [AuthService, MessageService, ConfirmationService],
})
export class SharedModule {}
