import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import {
  EmployeeLocationFilter,
  EmployeeSortBy,
  EmployeeStatusFilter,
  EmployeeTeamFilter,
  getTeamMeta,
  toDisplayLocationLabel
} from '../../models/employee.model';
import { EmployeeStoreService } from '../../services/employee-store.service';

@Component({
  selector: 'app-directory-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './directory-controls.component.html'
})
/**
 * Filter and sort control bar displayed above the employee grid.
 * Reads current filter/sort state from the store and dispatches change actions;
 * the store derives the visible employee list reactively.
 */
export class DirectoryControlsComponent {
  private readonly employeeStore = inject(EmployeeStoreService);

  // Expose store signals directly so the template can read active values for select bindings.
  readonly teamFilter = this.employeeStore.teamFilter;
  readonly locationFilter = this.employeeStore.locationFilter;
  readonly statusFilter = this.employeeStore.statusFilter;
  readonly sortBy = this.employeeStore.sortBy;
  readonly pageSize = this.employeeStore.pageSize;

  readonly teamOptions = computed<Array<{ value: EmployeeTeamFilter; label: string }>>(() => [
    { value: 'all', label: 'All Teams' },
    ...this.employeeStore.availableTeams().map((team) => ({
      value: team,
      label: getTeamMeta(team).label
    }))
  ]);

  readonly sortOptions: Array<{ value: EmployeeSortBy; label: string }> = [
    { value: EmployeeSortBy.RecentlyAdded, label: 'Recently Added' },
    { value: EmployeeSortBy.NameAscending, label: 'Name (A-Z)' },
    { value: EmployeeSortBy.Team, label: 'Department' }
  ];

  readonly pageSizeOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All results' },
    { value: '6', label: '6 per page' },
    { value: '12', label: '12 per page' },
    { value: '24', label: '24 per page' }
  ];

  readonly statusOptions = computed<Array<{ value: EmployeeStatusFilter; label: string }>>(() => [
    { value: 'all', label: 'All Statuses' },
    ...this.employeeStore.availableStatuses().map((status) => ({
      value: status,
      label: status === 'active' ? 'Active' : 'Pipeline'
    }))
  ]);

  readonly locationOptions = computed<Array<{ value: EmployeeLocationFilter; label: string }>>(() => [
    { value: 'all', label: 'All Locations' },
    ...this.employeeStore.availableLocations().map((location) => ({
      value: location,
      label: toDisplayLocationLabel(location)
    }))
  ]);

  onTeamFilterChange(value: string): void {
    this.employeeStore.setTeamFilter(value === 'all' ? 'all' : value);
  }

  onLocationFilterChange(value: string): void {
    const nextFilter = value === 'all' ? 'all' : value;
    this.employeeStore.setLocationFilter(nextFilter);
  }

  onStatusFilterChange(value: string): void {
    const nextFilter = value as EmployeeStatusFilter;
    this.employeeStore.setStatusFilter(nextFilter);
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
