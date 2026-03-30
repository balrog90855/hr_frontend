import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  DEFAULT_EMPLOYEE_LOCATION,
  EmployeeLocation,
  getTeamMeta,
  toDisplayLocationLabel,
  UpdateEmployeeInput
} from '../../models/employee.model';
import { EmployeeStoreService } from '../../services/employee-store.service';
import { JobStoreService } from '../../services/job-store.service';

@Component({
  selector: 'app-employee-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-details-modal.component.html'
})
/**
 * Modal dialog for viewing and editing an existing employee record.
 * Pre-populates the form with the selected employee's current data via an
 * Angular effect that runs every time the modal opens or the selection changes.
 * Delegates persistence to EmployeeStoreService.updateEmployeeDetails().
 */
export class EmployeeDetailsModalComponent {
  readonly customTeamOptionValue = '__custom__';
  readonly customLocationOptionValue = '__custom_location__';

  private readonly employeeStore = inject(EmployeeStoreService);
  private readonly jobStore = inject(JobStoreService);

  readonly isOpen = this.employeeStore.isEmployeeDetailsModalOpen;
  readonly allJobs = this.jobStore.jobs;
  readonly isLoadingJobs = this.jobStore.isLoading;
  /** The employee whose details are currently being viewed / edited. */
  readonly selectedEmployee = this.employeeStore.selectedEmployeeForDetails;
  /** Only admin users may save changes. */
  readonly canEdit = this.employeeStore.canAddEmployee;
  /** Prevents double-submits during the backend update call. */
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly saveErrorMessage = signal<string | null>(null);
  readonly isCustomTeam = signal(false);
  readonly customTeamText = signal('');
  readonly isCustomLocation = signal(false);
  readonly customLocationText = signal('');
  readonly jobFilterText = signal('');
  readonly filteredJobs = computed(() => {
    const term = this.jobFilterText().toLowerCase().trim();
    if (!term) {
      return this.allJobs();
    }

    return this.allJobs().filter(
      (job) =>
        job.job_number.toLowerCase().includes(term) ||
        job.job_title.toLowerCase().includes(term)
    );
  });

  readonly teamOptions = computed(() => {
    return this.employeeStore
      .availableTeams()
      .map((team) => ({
        value: team,
        label: getTeamMeta(team).label
      }));
  });

  readonly locationOptions = computed<Array<{ value: EmployeeLocation; label: string }>>(() => {
    const locations = this.employeeStore.availableLocations();
    const availableLocations = locations.length > 0 ? locations : [DEFAULT_EMPLOYEE_LOCATION];

    return availableLocations.map((location) => ({
      value: location,
      label: toDisplayLocationLabel(location)
    }));
  });

  formData: UpdateEmployeeInput = {
    jobNumber: '',
    fullName: '',
    jobTitle: '',
    team: '',
    location: DEFAULT_EMPLOYEE_LOCATION,
    avatarUrl: '',
    status: 'active'
  };

  constructor() {
    if (this.jobStore.jobs().length === 0) {
      this.jobStore.loadJobs();
    }

    // Sync form data whenever the modal opens with a new employee selection.
    effect(() => {
      const employee = this.selectedEmployee();
      const open = this.isOpen();

      if (!open) {
        return;
      }

      if (!employee) {
        return;
      }

      if (this.jobStore.jobs().length === 0) {
        this.jobStore.loadJobs();
      }

      this.formData = {
        jobNumber: employee.jobNumber,
        fullName: employee.fullName,
        jobTitle: employee.jobTitle,
        team: employee.team,
        location: employee.location,
        avatarUrl: employee.avatarUrl,
        status: this.toEditableStatus(employee.status)
      };

      this.syncTeamSelectionMode(employee.team);
      this.syncLocationSelectionMode(employee.location);
      this.saveErrorMessage.set(null);
    }, { allowSignalWrites: true });
  }

  teamSelectValue(): string {
    return this.isCustomTeam() ? this.customTeamOptionValue : this.formData.team;
  }

  onTeamSelectionChange(value: string): void {
    if (value === this.customTeamOptionValue) {
      this.isCustomTeam.set(true);
      this.formData.team = this.customTeamText().trim();
      return;
    }

    this.isCustomTeam.set(false);
    this.customTeamText.set('');
    this.formData.team = value;
  }

  onCustomTeamTextChange(value: string): void {
    this.customTeamText.set(value);
    this.formData.team = value.trim();
  }

  locationSelectValue(): string {
    return this.isCustomLocation() ? this.customLocationOptionValue : this.formData.location;
  }

  onLocationSelectionChange(value: string): void {
    if (value === this.customLocationOptionValue) {
      this.isCustomLocation.set(true);
      this.formData.location = this.customLocationText().trim();
      return;
    }

    this.isCustomLocation.set(false);
    this.customLocationText.set('');
    this.formData.location = value;
  }

  onCustomLocationTextChange(value: string): void {
    this.customLocationText.set(value);
    this.formData.location = value.trim();
  }

  onJobFilterTextChange(value: string): void {
    this.jobFilterText.set(value);
  }

  onJobNumberChange(jobNumber: string): void {
    const selectedJob = this.allJobs().find((job) => job.job_number === jobNumber);
    this.formData.jobTitle = selectedJob ? selectedJob.job_title : '';
  }

  close(): void {
    this.jobFilterText.set('');
    this.isCustomLocation.set(false);
    this.customLocationText.set('');
    this.employeeStore.closeEmployeeDetailsModal();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  save(): void {
    const employee = this.selectedEmployee();

    if (!employee || !this.canEdit()) {
      this.close();
      return;
    }

    const fullName = this.formData.fullName.trim();
    const jobNumber = this.formData.jobNumber.trim();
    const jobTitle = this.formData.jobTitle.trim();
    const location = this.formData.location.trim();

    if (!jobNumber || !fullName || !jobTitle || !location) {
      return;
    }

    this.saveErrorMessage.set(null);
    this.isSaving.set(true);

    this.employeeStore
      .updateEmployeeDetails(employee.id, {
        ...this.formData,
        jobNumber,
        fullName,
        jobTitle,
        location,
        avatarUrl: this.formData.avatarUrl?.trim() ?? ''
      })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          return;
        },
        error: () => {
          this.saveErrorMessage.set('Unable to save employee details. Please try again.');
        }
      });
  }

  removeEmployee(): void {
    const employee = this.selectedEmployee();

    if (!employee || !this.canEdit()) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${employee.fullName} from the directory? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.saveErrorMessage.set(null);
    this.isDeleting.set(true);

    this.employeeStore
      .deleteEmployee(employee.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          return;
        },
        error: () => {
          this.saveErrorMessage.set('Unable to remove employee. Please try again.');
        }
      });
  }

  private toEditableStatus(status: UpdateEmployeeInput['status']): UpdateEmployeeInput['status'] {
    return status === 'pipeline' ? 'pipeline' : 'active';
  }

  private syncTeamSelectionMode(team: string): void {
    const isKnownTeam = this.teamOptions().some((option) => option.value === team);

    if (team.trim().length > 0 && !isKnownTeam) {
      this.isCustomTeam.set(true);
      this.customTeamText.set(team);
      return;
    }

    this.isCustomTeam.set(false);
    this.customTeamText.set('');
  }

  private syncLocationSelectionMode(location: string): void {
    const isKnownLocation = this.locationOptions().some((option) => option.value === location);

    if (location.trim().length > 0 && !isKnownLocation) {
      this.isCustomLocation.set(true);
      this.customLocationText.set(location);
      return;
    }

    this.isCustomLocation.set(false);
    this.customLocationText.set('');
  }
}
