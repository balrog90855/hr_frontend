import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Employee, getTeamMeta, toDisplayLocationLabel } from '../../models/employee.model';
import { EmployeeStoreService } from '../../services/employee-store.service';

interface EmployeeCardViewModel {
  id: string;
  jobNumber: string;
  fullName: string;
  jobTitle: string;
  teamLabel: string;
  teamClass: string;
  locationLabel: string;
  locationClass: string;
  avatarUrl: string;
  appraisalDueDate?: string;
  appraisalLabel: string;
  appraisalClass: string;
  service?: string;
  grade?: string;
}

@Component({
  selector: 'app-employee-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-grid.component.html'
})
export class EmployeeGridComponent {
  private readonly employeeStore = inject(EmployeeStoreService);
  readonly canAddEmployee = this.employeeStore.canAddEmployee;
  readonly viewMode = this.employeeStore.viewMode;

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

  private toCardViewModel(employee: Employee): EmployeeCardViewModel {
    const teamMeta = getTeamMeta(employee.team);
    const locationLabel = toDisplayLocationLabel(employee.location);
    const locationClass = this.toLocationClass(employee.location);
    const { appraisalLabel, appraisalClass } = this.toAppraisalMeta(employee.appraisalDueDate);

    return {
      id: employee.id,
      jobNumber: employee.jobNumber,
      fullName: employee.fullName,
      jobTitle: employee.jobTitle,
      teamLabel: teamMeta.label,
      teamClass: teamMeta.badgeClass,
      locationLabel,
      locationClass,
      avatarUrl: employee.avatarUrl,
      appraisalDueDate: employee.appraisalDueDate,
      appraisalLabel,
      appraisalClass,
      service: employee.service,
      grade: employee.grade
    };
  }

  private toLocationClass(location: string): string {
    const normalized = location.trim().toLowerCase();
    if (normalized === 'north') return 'bg-cyan-50 text-cyan-700';
    if (normalized === 'south') return 'bg-slate-100 text-slate-700';
    return 'bg-amber-50 text-amber-700';
  }

  private toAppraisalMeta(dateStr: string | undefined): { appraisalLabel: string; appraisalClass: string } {
    if (!dateStr) {
      return { appraisalLabel: 'No date set', appraisalClass: 'bg-slate-100 text-slate-500' };
    }
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
    const label = `Due: ${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    if (diffDays < 0) return { appraisalLabel: label, appraisalClass: 'bg-red-50 text-red-700' };
    if (diffDays <= 90) return { appraisalLabel: label, appraisalClass: 'bg-amber-50 text-amber-700' };
    return { appraisalLabel: label, appraisalClass: 'bg-green-50 text-green-700' };
  }
}
