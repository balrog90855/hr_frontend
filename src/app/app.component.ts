import { Component } from '@angular/core';
import { AddEmployeeModalComponent } from './components/add-employee-modal/add-employee-modal.component';
import { EmployeeDetailsModalComponent } from './components/employee-details-modal/employee-details-modal.component';
import { QuickActionsFabComponent } from './components/quick-actions-fab/quick-actions-fab.component';
import { SidebarNavComponent } from './components/sidebar-nav/sidebar-nav.component';
import { ToastStackComponent } from './components/toast-stack/toast-stack.component';
import { TopHeaderComponent } from './components/top-header/top-header.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SidebarNavComponent,
    TopHeaderComponent,
    RouterOutlet,
    QuickActionsFabComponent,
    AddEmployeeModalComponent,
    EmployeeDetailsModalComponent,
    ToastStackComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Talent Network';
}
