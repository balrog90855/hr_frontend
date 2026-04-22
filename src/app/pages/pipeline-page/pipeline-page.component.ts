import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  DEFAULT_EMPLOYEE_LOCATION,
  Employee,
  EmployeeLocation,
  EmployeeLocationFilter,
  getTeamMeta,
  toDisplayLocationLabel,
  UpdateEmployeeInput
} from '../../models/employee.model';
import { Job } from '../../models/job.model';
import { AuthService } from '../../services/auth.service';
import { EmployeeStoreService } from '../../services/employee-store.service';
import { GlobalSearchService } from '../../services/global-search.service';
import { JobStoreService } from '../../services/job-store.service';
import { PipelineStoreService } from '../../services/pipeline-store.service';

/** Display-ready view-model for a vacant position row. */
interface VacantPositionViewModel {
  jobNumber: string;
  title: string;
  vacancyLabel: string;
  vacancyClass: string;
  retainedLabel: string;
  retainedClass: string;
  createdAt: string;
  updatedAt: string;
}

/** Display-ready view-model for a pipeline candidate row. */
interface PipelinePersonViewModel {
  id: string;
  jobNumber: string;
  fullName: string;
  jobTitle: string;
  locationLabel: string;
  teamLabel: string;
  statusLabel: string;
}

/** Editable form values bound to the pipeline person detail modal. */
interface PipelinePersonEditForm {
  jobNumber: string;
  fullName: string;
  jobTitle: string;
  location: EmployeeLocation;
  team: string;
  status: UpdateEmployeeInput['status'];
}

type PipelineSectionView = 'both' | 'pipeline' | 'vacancies';
type PipelineTeamFilter = string | 'all';

@Component({
  selector: 'app-pipeline-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pipeline-page.component.html'
})
/**
 * Talent pipeline page.
 *
 * Displays two sections — vacant positions and pipeline candidates — that can
 * be filtered by team, location, and a global search term.
 * Pipeline people start empty until a backend source is wired; job positions
 * are loaded from the backend job store at runtime.
 */
export class PipelinePageComponent {
  readonly customTeamOptionValue = '__custom__';
  readonly customLocationOptionValue = '__custom_location__';

  private readonly authService = inject(AuthService);
  private readonly employeeStore = inject(EmployeeStoreService);
  private readonly jobStore = inject(JobStoreService);
  private readonly globalSearchService = inject(GlobalSearchService);
  private readonly pipelineStore = inject(PipelineStoreService);

  /** In-memory pipeline people list starts empty until backend data is available. */
  private readonly pipelinePeopleState = signal<Employee[]>([]);
  private readonly selectedPipelinePersonIdState = signal<string | null>(null);
  private readonly pipelinePersonModalOpenState = signal(false);

  readonly isAdmin = this.authService.isAdmin;
  readonly sectionView = this.pipelineStore.sectionView;
  readonly teamFilter = this.pipelineStore.teamFilter;
  readonly locationFilter = this.pipelineStore.locationFilter;

  readonly sectionViewOptions: Array<{ value: PipelineSectionView; label: string }> = [
    { value: 'both', label: 'Both' },
    { value: 'pipeline', label: 'Pipeline Only' },
    { value: 'vacancies', label: 'Vacancies Only' }
  ];

  readonly teamFilterOptions = computed<Array<{ value: PipelineTeamFilter; label: string }>>(() => [
    { value: 'all', label: 'All Teams' },
    ...this.availablePipelineTeams().map((team) => ({
      value: team,
      label: getTeamMeta(team).label
    }))
  ]);

  readonly locationFilterOptions = computed<Array<{ value: EmployeeLocationFilter; label: string }>>(() => [
    { value: 'all', label: 'All Locations' },
    ...this.availablePipelineLocations().map((location) => ({
      value: location,
      label: toDisplayLocationLabel(location)
    }))
  ]);

  readonly showVacancies = computed(() => {
    const sectionView = this.pipelineStore.sectionView();
    return sectionView === 'both' || sectionView === 'vacancies';
  });

  readonly showPipeline = computed(() => {
    const sectionView = this.pipelineStore.sectionView();
    return sectionView === 'both' || sectionView === 'pipeline';
  });

  readonly pipelineEmployees = this.pipelinePeopleState.asReadonly();
  readonly jobs = this.jobStore.jobs;

  readonly assignedJobIds = computed(() => {
    const ids = new Set<string>();
    for (const person of this.pipelineEmployees()) {
      if (person.jobId) {
        ids.add(person.jobId);
      }
    }
    return ids;
  });

  readonly vacantPositions = computed(() => {
    const searchTerm = this.globalSearchService.normalizedSearchTerm();
    const assignedJobIds = this.assignedJobIds();

    const filteredByMeta = this.jobs()
      .filter((job) => job.is_vacant === 1 && job.is_retained === 1)
      .filter((job) => !assignedJobIds.has(job.job_number));

    const filtered =
      searchTerm.length === 0
        ? filteredByMeta
        : filteredByMeta.filter((position) => {
            const searchableText = [
              position.job_number,
              position.job_title,
              position.is_vacant === 1 ? 'vacant open' : 'filled closed',
              position.created_at,
              position.updated_at
            ]
              .join(' ')
              .toLowerCase();

            return searchableText.includes(searchTerm);
          });

    return filtered.map((position) => this.toVacantViewModel(position));
  });

  readonly pipelinePeople = computed(() => {
    const searchTerm = this.globalSearchService.normalizedSearchTerm();
    const teamFilter = this.pipelineStore.teamFilter();
    const locationFilter = this.pipelineStore.locationFilter();

    const filteredByMeta = this.pipelineEmployees().filter((person) => {
      const matchesTeam = teamFilter === 'all' || person.team === teamFilter;
      const matchesLocation =
        locationFilter === 'all' || locationFilter === person.location;

      return matchesTeam && matchesLocation;
    });

    const filtered =
      searchTerm.length === 0
        ? filteredByMeta
        : filteredByMeta.filter((person) => {
            const searchableText = [
              person.jobNumber,
              person.fullName,
              person.jobTitle,
              getTeamMeta(person.team).label,
              this.toLocationLabel(person.location),
              person.pipelineStage ?? 'training',
              person.trainingCourse ?? '',
              person.expectedStartDate ?? '',
              person.jobId ?? 'unassigned'
            ]
              .join(' ')
              .toLowerCase();

            return searchableText.includes(searchTerm);
          });

    return filtered.map((person) => this.toPipelineViewModel(person));
  });
  readonly selectedPipelinePerson = computed(() => {
    const selectedId = this.selectedPipelinePersonIdState();

    if (!selectedId) {
      return null;
    }

    return this.pipelineEmployees().find((person) => person.id === selectedId) ?? null;
  });
  readonly isPipelinePersonModalOpen = this.pipelinePersonModalOpenState.asReadonly();
  readonly isCustomTeam = signal(false);
  readonly customTeamText = signal('');
  readonly isCustomLocation = signal(false);
  readonly customLocationText = signal('');
  readonly isDeletingPipelinePerson = signal(false);
  readonly jobFilterText = signal('');
  readonly filteredJobs = computed(() => {
    const term = this.jobFilterText().toLowerCase().trim();
    if (!term) {
      return this.jobs();
    }

    return this.jobs().filter(
      (job) =>
        job.job_number.toLowerCase().includes(term) ||
        job.job_title.toLowerCase().includes(term)
    );
  });

  readonly teamOptions = computed<Array<{ value: string; label: string }>>(() =>
    this.availablePipelineTeams().map((team) => ({
      value: team,
      label: getTeamMeta(team).label
    }))
  );

  readonly locationOptions = computed<Array<{ value: EmployeeLocation; label: string }>>(() => {
    const locations = this.availablePipelineLocations();
    const availableLocations = locations.length > 0 ? locations : [DEFAULT_EMPLOYEE_LOCATION];

    return availableLocations.map((location) => ({
      value: location,
      label: toDisplayLocationLabel(location)
    }));
  });

  formData: PipelinePersonEditForm = {
    jobNumber: '',
    fullName: '',
    jobTitle: '',
    location: DEFAULT_EMPLOYEE_LOCATION,
    team: '',
    status: 'active'
  };

  constructor() {
    if (this.jobStore.jobs().length === 0) {
      this.jobStore.loadJobs();
    }

    effect(() => {
      const employees = this.employeeStore.employees();

      this.pipelinePeopleState.set(
        employees.filter((employee) => this.isPipelineStatus(employee.status))
      );
    }, { allowSignalWrites: true });

    effect(() => {
      const selected = this.selectedPipelinePerson();
      const open = this.pipelinePersonModalOpenState();

      if (!open) {
        return;
      }

      if (this.jobStore.jobs().length === 0) {
        this.jobStore.loadJobs();
      }

      if (!selected) {
        return;
      }

      this.formData = {
        jobNumber: selected.jobNumber,
        fullName: selected.fullName,
        jobTitle: selected.jobTitle,
        location: selected.location,
        team: selected.team,
        status: this.toEditableStatus(selected.status)
      };

      this.syncTeamSelectionMode(selected.team);
      this.syncLocationSelectionMode(selected.location);
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
    const selectedJob = this.jobs().find((job) => job.job_number === jobNumber);
    this.formData.jobTitle = selectedJob ? selectedJob.job_title : '';
  }

  openPipelinePersonDetails(personId: string): void {
    this.selectedPipelinePersonIdState.set(personId);
    this.pipelinePersonModalOpenState.set(true);
  }

  setSectionView(value: string): void {
    this.pipelineStore.setSectionView(value as 'both' | 'pipeline' | 'vacancies');
  }

  setTeamFilter(value: string): void {
    this.pipelineStore.setTeamFilter(value as PipelineTeamFilter);
  }

  setLocationFilter(value: string): void {
    this.pipelineStore.setLocationFilter(value === 'all' ? 'all' : value);
  }

  closePipelinePersonDetails(): void {
    this.pipelinePersonModalOpenState.set(false);
    this.selectedPipelinePersonIdState.set(null);
    this.isCustomTeam.set(false);
    this.customTeamText.set('');
    this.isCustomLocation.set(false);
    this.customLocationText.set('');
    this.jobFilterText.set('');
  }

  onPipelineModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closePipelinePersonDetails();
    }
  }

  savePipelinePersonDetails(): void {
    if (!this.isAdmin()) {
      this.closePipelinePersonDetails();
      return;
    }

    const selected = this.selectedPipelinePerson();

    if (!selected) {
      return;
    }

    const fullName = this.formData.fullName.trim();
    const jobNumber = this.formData.jobNumber.trim();
    const jobTitle = this.formData.jobTitle.trim();
    const team = this.formData.team.trim();
    const location = this.formData.location.trim();

    if (!jobNumber || !fullName || !jobTitle || !team || !location) {
      return;
    }

    const payload: UpdateEmployeeInput = {
      jobNumber,
      fullName,
      jobTitle,
      team,
      location,
      avatarUrl: selected.avatarUrl,
      status: this.formData.status
    };

    this.employeeStore
      .updateEmployeeDetails(selected.id, payload)
      .subscribe({
        next: () => {
          this.closePipelinePersonDetails();
        },
        error: () => {
          return;
        }
      })
  }

  removePipelinePerson(): void {
    if (!this.isAdmin()) {
      return;
    }

    const selected = this.selectedPipelinePerson();

    if (!selected) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${selected.fullName} from the directory? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.isDeletingPipelinePerson.set(true);

    this.employeeStore
      .deleteEmployee(selected.id)
      .pipe(finalize(() => this.isDeletingPipelinePerson.set(false)))
      .subscribe({
        next: () => {
          this.closePipelinePersonDetails();
        },
        error: () => {
          return;
        }
      });
  }

  private toVacantViewModel(position: Job): VacantPositionViewModel {
    return {
      jobNumber: position.job_number,
      title: position.job_title,
      vacancyLabel: position.is_vacant === 1 ? 'Vacant' : 'Filled',
      vacancyClass:
        position.is_vacant === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700',
      retainedLabel: position.is_retained === 1 ? 'Retained' : 'Not Retained',
      retainedClass:
        position.is_retained === 1 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700',
      createdAt: this.formatTimestamp(position.created_at),
      updatedAt: this.formatTimestamp(position.updated_at)
    };
  }

  private toPipelineViewModel(person: Employee): PipelinePersonViewModel {
    return {
      id: person.id,
      jobNumber: person.jobNumber,
      fullName: person.fullName,
      jobTitle: person.jobTitle,
      locationLabel: this.toLocationLabel(person.location),
      teamLabel: getTeamMeta(person.team).label,
      statusLabel: this.toStatusLabel(person.status)
    };
  }

  private toLocationLabel(location: EmployeeLocation): string {
    return toDisplayLocationLabel(location);
  }

  private formatTimestamp(value: string): string {
    return value ? value.replace('T', ' ') : 'N/A';
  }

  private toStatusLabel(status: Employee['status']): string {
    return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  }

  private isPipelineStatus(status: Employee['status']): boolean {
    return status.trim().toLowerCase() === 'pipeline';
  }

  private toEditableStatus(status: UpdateEmployeeInput['status']): UpdateEmployeeInput['status'] {
    return status === 'pipeline' ? 'pipeline' : 'active';
  }

  private availablePipelineTeams(): string[] {
    const teams = new Set(
      this.pipelineEmployees()
        .map((employee) => employee.team.trim())
        .filter((team) => team.length > 0)
    );

    return [...teams].sort((first, second) =>
      getTeamMeta(first).label.localeCompare(getTeamMeta(second).label)
    );
  }

  private availablePipelineLocations(): EmployeeLocation[] {
    const locations = new Set(
      this.pipelineEmployees()
        .map((employee) => employee.location.trim())
        .filter((location) => location.length > 0)
    );

    return [...locations].sort((first, second) => first.localeCompare(second));
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
