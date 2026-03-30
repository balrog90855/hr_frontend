import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Employee, getTeamMeta, toDisplayLocationLabel } from '../../models/employee.model';
import { EmployeeStoreService } from '../../services/employee-store.service';

/**
 * View-model used by each card in the grid.
 * Derived from the Employee domain model; holds pre-computed display strings
 * and Tailwind class names so the template stays logic-free.
 */
interface EmployeeCardViewModel {
  id: string;
  jobNumber: string;
  fullName: string;
  jobTitle: string;
  /** Human-readable team label (e.g. 'Engineering'). */
  teamLabel: string;
  /** Tailwind badge colour classes for the team chip. */
  teamClass: string;
  /** Human-readable location label derived from the backend location value. */
  locationLabel: string;
  /** Tailwind badge colour classes for the location chip. */
  locationClass: string;
  avatarUrl: string;
}

@Component({
  selector: 'app-employee-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-grid.component.html'
})
/**
 * Renders the current page of employees as a responsive card grid.
 * Maps Employee domain objects to EmployeeCardViewModels for the template.
 * Admin users see an extra 'Add New Member' card and can click cards to open
 * the details modal.
 */
export class EmployeeGridComponent {
  private readonly employeeStore = inject(EmployeeStoreService);
  /** Controls visibility of edit affordances and the 'Add' card. */
  readonly canAddEmployee = this.employeeStore.canAddEmployee;

  /** Current page of employees projected into view-models. Recomputes on page/filter change. */
  readonly employees = computed(() =>
    this.employeeStore.pagedEmployees().map((employee) => this.toCardViewModel(employee))
  );

  requestAddEmployee(): void {
    this.employeeStore.openAddEmployeeModal();
  }

  openEmployeeDetails(employeeId: string): void {
    this.employeeStore.openEmployeeDetailsModal(employeeId);
  }

  trackById(_index: number, employee: EmployeeCardViewModel): string {
    return employee.id;
  }

  /** Projects a raw Employee record into the display-friendly EmployeeCardViewModel. */
  private toCardViewModel(employee: Employee): EmployeeCardViewModel {
    const teamMeta = getTeamMeta(employee.team);
    const locationLabel = toDisplayLocationLabel(employee.location);
    const locationClass = this.toLocationClass(employee.location);

    return {
      id: employee.id,
      jobNumber: employee.jobNumber,
      fullName: employee.fullName,
      jobTitle: employee.jobTitle,
      teamLabel: teamMeta.label,
      teamClass: teamMeta.badgeClass,
      locationLabel,
      locationClass,
      avatarUrl: employee.avatarUrl
    };
  }

  private toLocationClass(location: string): string {
    const normalized = location.trim().toLowerCase();

    if (normalized === 'north') {
      return 'bg-cyan-50 text-cyan-700';
    }

    if (normalized === 'south') {
      return 'bg-slate-100 text-slate-700';
    }

    return 'bg-amber-50 text-amber-700';
  }
}
