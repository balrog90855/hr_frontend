import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import {
  EmployeeLocationFilter,
  EmployeeRetentionFilter,
  EmployeeSortBy,
  EmployeeStatusFilter,
  EmployeeTeamFilter,
  getTeamMeta,
  toDisplayLocationLabel
} from '../../models/employee.model';
import { AppraisalDueDateFilter, EmployeeStoreService, ViewMode } from '../../services/employee-store.service';

@Component({
  selector: 'app-directory-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './directory-controls.component.html'
})
export class DirectoryControlsComponent {
  private readonly employeeStore = inject(EmployeeStoreService);

  readonly teamFilter = this.employeeStore.teamFilter;
  readonly locationFilter = this.employeeStore.locationFilter;
  readonly statusFilter = this.employeeStore.statusFilter;
  readonly retentionFilter = this.employeeStore.retentionFilter;
  readonly sortBy = this.employeeStore.sortBy;
  readonly pageSize = this.employeeStore.pageSize;
  readonly viewMode = this.employeeStore.viewMode;
  readonly serviceFilter = this.employeeStore.serviceFilter;
  readonly gradeFilter = this.employeeStore.gradeFilter;
  readonly appraisalDueDateFilter = this.employeeStore.appraisalDueDateFilter;

  readonly teamOptions = computed<Array<{ value: EmployeeTeamFilter; label: string }>>(() => [
    { value: 'all', label: 'All Teams' },
    ...this.employeeStore.availableTeams().map((team) => ({
      value: team,
      label: getTeamMeta(team).label
    }))
  ]);

  readonly locationOptions = computed<Array<{ value: EmployeeLocationFilter; label: string }>>(() => [
    { value: 'all', label: 'All Locations' },
    ...this.employeeStore.availableLocations().map((location) => ({
      value: location,
      label: toDisplayLocationLabel(location)
    }))
  ]);

  readonly statusOptions = computed<Array<{ value: EmployeeStatusFilter; label: string }>>(() => [
    { value: 'all', label: 'All Statuses' },
    ...this.employeeStore.availableStatuses().map((status) => ({
      value: status,
      label: status === 'active' ? 'Active' : 'Pipeline'
    }))
  ]);

  readonly retentionOptions: Array<{ value: EmployeeRetentionFilter; label: string }> = [
    { value: 'all', label: 'All Employees' },
    { value: 'retained', label: 'In Retained Jobs' },
    { value: 'not-retained', label: 'In Not Retained Jobs' }
  ];

  readonly serviceOptions = computed<Array<{ value: string; label: string }>>(() => [
    { value: 'all', label: 'All Services' },
    ...this.employeeStore.availableServices().map((s) => ({ value: s, label: s }))
  ]);

  readonly gradeOptions = computed<Array<{ value: string; label: string }>>(() => [
    { value: 'all', label: 'All Grades' },
    ...this.employeeStore.availableGrades().map((g) => ({ value: g, label: g }))
  ]);

  readonly dueDateOptions: Array<{ value: AppraisalDueDateFilter; label: string }> = [
    { value: 'all', label: 'Any date' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'this-month', label: 'This month' },
    { value: 'this-quarter', label: 'This quarter' },
    { value: 'this-year', label: 'This year' }
  ];

  readonly sortOptions = computed<Array<{ value: EmployeeSortBy; label: string }>>(() => {
    const base = [
      { value: EmployeeSortBy.RecentlyAdded, label: 'Recently Added' },
      { value: EmployeeSortBy.NameAscending, label: 'Name (A-Z)' },
      { value: EmployeeSortBy.Team, label: 'Department' }
    ];
    if (this.viewMode() === 'appraisals') {
      return [...base, { value: EmployeeSortBy.AppraisalDate, label: 'Appraisal Date' }];
    }
    return base;
  });

  readonly pageSizeOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All results' },
    { value: '6', label: '6 per page' },
    { value: '12', label: '12 per page' },
    { value: '24', label: '24 per page' }
  ];

  setViewMode(mode: ViewMode): void {
    this.employeeStore.setViewMode(mode);
  }

  onTeamFilterChange(value: string): void {
    this.employeeStore.setTeamFilter(value === 'all' ? 'all' : value);
  }

  onLocationFilterChange(value: string): void {
    this.employeeStore.setLocationFilter(value === 'all' ? 'all' : value);
  }

  onStatusFilterChange(value: string): void {
    this.employeeStore.setStatusFilter(value as EmployeeStatusFilter);
  }

  onRetentionFilterChange(value: string): void {
    this.employeeStore.setRetentionFilter(value as EmployeeRetentionFilter);
  }

  onServiceFilterChange(value: string): void {
    this.employeeStore.setServiceFilter(value);
  }

  onGradeFilterChange(value: string): void {
    this.employeeStore.setGradeFilter(value);
  }

  onDueDateFilterChange(value: string): void {
    this.employeeStore.setAppraisalDueDateFilter(value as AppraisalDueDateFilter);
  }

  onSortByChange(value: string): void {
    this.employeeStore.setSortBy(value as EmployeeSortBy);
  }

  onPageSizeChange(value: string): void {
    if (value === 'all') {
      this.employeeStore.setPageSize('all');
      return;
    }
    this.employeeStore.setPageSize(Number(value));
  }
}
