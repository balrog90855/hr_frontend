import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EmployeeStoreService } from '../../services/employee-store.service';

@Component({
  selector: 'app-sidebar-nav',
  imports: [RouterModule],
  standalone: true,
  templateUrl: './sidebar-nav.component.html'
})
/**
 * Persistent left-side navigation panel.
 * Exposes an 'Add Employee' shortcut in the sidebar that is only visible
 * to admin users, consistent with the grid's add card affordance.
 */
export class SidebarNavComponent {
  private readonly employeeStore = inject(EmployeeStoreService);
  /** Mirrors the store's admin check; hides the add-employee nav item for non-admins. */
  readonly canAddEmployee = this.employeeStore.canAddEmployee;

  requestAddEmployee(): void {
    this.employeeStore.openAddEmployeeModal();
  }
}
