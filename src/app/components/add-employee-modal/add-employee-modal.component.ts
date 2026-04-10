import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  CreateEmployeeInput,
  DEFAULT_EMPLOYEE_LOCATION,
  EmployeeLocation,
  getTeamMeta,
  toDisplayLocationLabel
} from '../../models/employee.model';
import { EmployeeStoreService } from '../../services/employee-store.service';
import { JobStoreService } from '../../services/job-store.service';

@Component({
  selector: 'app-add-employee-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-employee-modal.component.html'
})
/**
 * Modal dialog for creating a new employee record.
 * Only rendered / actionable when the signed-in user has admin access.
 * Delegates persistence to EmployeeStoreService.addEmployee().
 */
export class AddEmployeeModalComponent {
  readonly customTeamOptionValue = '__custom__';
  readonly customLocationOptionValue = '__custom_location__';

  private readonly employeeStore = inject(EmployeeStoreService);
  private readonly jobStore = inject(JobStoreService);

  readonly isOpen = this.employeeStore.isAddEmployeeModalOpen;
  readonly canAddEmployee = this.employeeStore.canAddEmployee;
  readonly isSaving = signal(false);
  readonly saveErrorMessage = signal<string | null>(null);
  readonly isCustomTeam = signal(false);
  readonly customTeamText = signal('');
  readonly isCustomLocation = signal(false);
  readonly customLocationText = signal('');
  readonly isCustomService = signal(false);
  readonly customServiceText = signal('');
  readonly isCustomGrade = signal(false);
  readonly customGradeText = signal('');
  readonly jobFilterText = signal('');
  readonly allJobs = this.jobStore.jobs;
  readonly isLoadingJobs = this.jobStore.isLoading;
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

  /** Dropdown options combine defaults and any backend-provided team values. */
  readonly teamOptions = computed(() =>
    this.employeeStore
      .availableTeams()
      .map((team) => ({
        value: team,
        label: getTeamMeta(team).label
      }))
  );

  readonly locationOptions = computed<Array<{ value: EmployeeLocation; label: string }>>(() => {
    const locations = this.employeeStore.availableLocations();
    const availableLocations = locations.length > 0 ? locations : [DEFAULT_EMPLOYEE_LOCATION];

    return availableLocations.map((location) => ({
      value: location,
      label: toDisplayLocationLabel(location)
    }));
  });

  readonly serviceOptions = computed(() =>
    this.employeeStore.availableServices().map((s) => ({ value: s, label: s }))
  );

  readonly gradeOptions = computed(() =>
    this.employeeStore.availableGrades().map((g) => ({ value: g, label: g }))
  );

  readonly customServiceOptionValue = '__custom_service__';
  readonly customGradeOptionValue = '__custom_grade__';

  constructor() {
    if (this.jobStore.jobs().length === 0) {
      this.jobStore.loadJobs();
    }

    effect(() => {
      const open = this.isOpen();

      if (!open) {
        return;
      }

      if (this.jobStore.jobs().length === 0) {
        this.jobStore.loadJobs();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const selectedJobNumber = this.formData.jobNumber;
      if (!selectedJobNumber) {
        return;
      }

      const selectedJob = this.allJobs().find((job) => job.job_number === selectedJobNumber);
      if (!selectedJob) {
        this.formData.jobNumber = '';
        this.formData.jobTitle = '';
      }
    }, { allowSignalWrites: true });
  }

  formData: CreateEmployeeInput = {
    jobNumber: '',
    fullName: '',
    jobTitle: '',
    team: '',
    location: this.defaultLocation(),
    avatarUrl: '',
    status: 'active',
    service: '',
    grade: '',
    appraisalDueDate: ''
  };

  onJobNumberChange(jobNumber: string): void {
    const selectedJob = this.allJobs().find((job) => job.job_number === jobNumber);
    if (selectedJob) {
      this.formData.jobTitle = selectedJob.job_title;
      return;
    }

    this.formData.jobTitle = '';
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

  serviceSelectValue(): string {
    return this.isCustomService() ? this.customServiceOptionValue : (this.formData.service ?? '');
  }

  onServiceSelectionChange(value: string): void {
    if (value === this.customServiceOptionValue) {
      this.isCustomService.set(true);
      this.formData.service = this.customServiceText().trim();
      return;
    }
    this.isCustomService.set(false);
    this.customServiceText.set('');
    this.formData.service = value;
  }

  onCustomServiceTextChange(value: string): void {
    this.customServiceText.set(value);
    this.formData.service = value.trim();
  }

  gradeSelectValue(): string {
    return this.isCustomGrade() ? this.customGradeOptionValue : (this.formData.grade ?? '');
  }

  onGradeSelectionChange(value: string): void {
    if (value === this.customGradeOptionValue) {
      this.isCustomGrade.set(true);
      this.formData.grade = this.customGradeText().trim();
      return;
    }
    this.isCustomGrade.set(false);
    this.customGradeText.set('');
    this.formData.grade = value;
  }

  onCustomGradeTextChange(value: string): void {
    this.customGradeText.set(value);
    this.formData.grade = value.trim();
  }

  onJobFilterTextChange(value: string): void {
    this.jobFilterText.set(value);
  }

  close(): void {
    this.saveErrorMessage.set(null);
    this.isCustomTeam.set(false);
    this.customTeamText.set('');
    this.isCustomLocation.set(false);
    this.customLocationText.set('');
    this.isCustomService.set(false);
    this.customServiceText.set('');
    this.isCustomGrade.set(false);
    this.customGradeText.set('');
    this.jobFilterText.set('');
    this.employeeStore.closeAddEmployeeModal();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  save(): void {
    if (!this.canAddEmployee()) {
      this.close();
      return;
    }

    const fullName = this.formData.fullName.trim();
    const jobNumber = this.formData.jobNumber.trim();
    const selectedVacantJob = this.allJobs().find((job) => job.job_number === jobNumber);

    if (!jobNumber || !fullName || !selectedVacantJob) {
      return;
    }

    if (!this.formData.team.trim()) {
      return;
    }

    const location = this.formData.location.trim();
    if (!location) {
      return;
    }

    this.saveErrorMessage.set(null);
    this.isSaving.set(true);

    this.employeeStore
      .addEmployee({
        ...this.formData,
        jobNumber,
        fullName,
        jobTitle: selectedVacantJob.job_title,
        location,
        avatarUrl: this.formData.avatarUrl?.trim() ?? ''
      })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.jobStore.loadJobs();
          this.formData = {
            jobNumber: '',
            fullName: '',
            jobTitle: '',
            team: '',
            location: this.defaultLocation(),
            avatarUrl: '',
            status: 'active',
            service: '',
            grade: '',
            appraisalDueDate: ''
          };
          this.isCustomTeam.set(false);
          this.customTeamText.set('');
          this.isCustomLocation.set(false);
          this.customLocationText.set('');
          this.isCustomService.set(false);
          this.customServiceText.set('');
          this.isCustomGrade.set(false);
          this.customGradeText.set('');
        },
        error: () => {
          this.saveErrorMessage.set('Unable to add employee. Please try again.');
        }
      });
  }

  private defaultLocation(): EmployeeLocation {
    return this.employeeStore.availableLocations()[0] ?? DEFAULT_EMPLOYEE_LOCATION;
  }
}
