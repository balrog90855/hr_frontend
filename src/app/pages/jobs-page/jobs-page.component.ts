import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Job } from '../../models/job.model';
import { AuthService } from '../../services/auth.service';
import { GlobalSearchService } from '../../services/global-search.service';
import { JobApiService } from '../../services/job-api.service';
import { JobStoreService } from '../../services/job-store.service';

interface JobCardViewModel {
  jobNumber: string;
  title: string;
  vacancyLabel: string;
  vacancyClass: string;
  retainedLabel: string;
  retainedClass: string;
}

interface JobEditForm {
  jobNumber: string;
  jobTitle: string;
  isRetained: number;
}

type JobRetentionFilter = 'all' | 'retained' | 'not-retained';

@Component({
  selector: 'app-jobs-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jobs-page.component.html'
})
export class JobsPageComponent {
  private readonly authService = inject(AuthService);
  private readonly jobStore = inject(JobStoreService);
  private readonly jobApi = inject(JobApiService);
  private readonly globalSearchService = inject(GlobalSearchService);

  private readonly selectedJobNumberState = signal<string | null>(null);
  private readonly jobModalOpenState = signal(false);
  private readonly createModeState = signal(false);
  private readonly retentionFilterState = signal<JobRetentionFilter>('all');

  readonly isAdmin = this.authService.isAdmin;
  readonly jobs = this.jobStore.jobs;
  readonly isJobModalOpen = this.jobModalOpenState.asReadonly();
  readonly isCreateMode = this.createModeState.asReadonly();
  readonly retentionFilter = this.retentionFilterState.asReadonly();
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly saveErrorMessage = signal<string | null>(null);

  readonly selectedJob = computed(() => {
    const selectedJobNumber = this.selectedJobNumberState();

    if (!selectedJobNumber) {
      return null;
    }

    return this.jobs().find((job) => job.job_number === selectedJobNumber) ?? null;
  });

  readonly displayedJobs = computed(() => {
    const searchTerm = this.globalSearchService.normalizedSearchTerm();
    const retentionFilter = this.retentionFilterState();
    const jobs = this.jobs();

    const filteredByRetention =
      retentionFilter === 'all'
        ? jobs
        : jobs.filter((job) => {
            if (retentionFilter === 'retained') {
              return job.is_retained === 1;
            }

            return job.is_retained !== 1;
          });

    const filtered =
      searchTerm.length === 0
        ? filteredByRetention
        : filteredByRetention.filter((job) => {
            const searchableText = [
              job.job_number,
              job.job_title,
              job.is_vacant === 1 ? 'vacant open' : 'filled closed',
              job.is_retained === 1 ? 'retained' : 'not retained'
            ]
              .join(' ')
              .toLowerCase();

            return searchableText.includes(searchTerm);
          });

    return filtered.map((job) => this.toJobCardViewModel(job));
  });

  formData: JobEditForm = {
    jobNumber: '',
    jobTitle: '',
    isRetained: 0
  };

  constructor() {
    if (this.jobStore.jobs().length === 0) {
      this.jobStore.loadJobs();
    }

    effect(() => {
      if (!this.jobStore.isCreateJobModalRequested()) {
        return;
      }

      this.openCreateJobModal();
      this.jobStore.consumeCreateJobModalRequest();
    });
  }

  setRetentionFilter(filter: JobRetentionFilter): void {
    this.retentionFilterState.set(filter);
  }

  openJobDetails(jobNumber: string): void {
    this.selectedJobNumberState.set(jobNumber);
    this.createModeState.set(false);

    const selected = this.selectedJob();
    if (selected) {
      this.formData = {
        jobNumber: selected.job_number,
        jobTitle: selected.job_title,
        isRetained: selected.is_retained === 1 ? 1 : 0
      };
    }

    this.jobModalOpenState.set(true);
    this.saveErrorMessage.set(null);
  }

  openCreateJobModal(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.selectedJobNumberState.set(null);
    this.createModeState.set(true);
    this.formData = {
      jobNumber: '',
      jobTitle: '',
      isRetained: 0
    };
    this.saveErrorMessage.set(null);
    this.jobModalOpenState.set(true);
  }

  closeJobDetails(): void {
    this.jobModalOpenState.set(false);
    this.selectedJobNumberState.set(null);
    this.createModeState.set(false);
    this.saveErrorMessage.set(null);
    this.formData = {
      jobNumber: '',
      jobTitle: '',
      isRetained: 0
    };
  }

  onJobModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeJobDetails();
    }
  }

  saveJobDetails(): void {
    if (!this.isAdmin()) {
      this.closeJobDetails();
      return;
    }

    const jobNumber = this.formData.jobNumber.trim();
    const jobTitle = this.formData.jobTitle.trim();

    if (!jobTitle || (this.isCreateMode() && !jobNumber)) {
      this.saveErrorMessage.set('Job number and title are required.');
      return;
    }

    this.saveErrorMessage.set(null);
    this.isSaving.set(true);

    const request$ = this.isCreateMode()
      ? this.jobApi.createJob({
          job_number: jobNumber,
          job_title: jobTitle,
          is_retained: this.formData.isRetained === 1 ? 1 : 0
        })
      : this.jobApi.updateJob(jobNumber, {
          job_title: jobTitle,
          is_retained: this.formData.isRetained === 1 ? 1 : 0
        });

    request$
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.jobStore.loadJobs();
          this.closeJobDetails();
        },
        error: () => {
          this.saveErrorMessage.set('Unable to save job changes. Please try again.');
        }
      });
  }

  removeJob(): void {
    if (!this.isAdmin() || this.isCreateMode()) {
      return;
    }

    const selected = this.selectedJob();

    if (!selected) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selected.job_number} (${selected.job_title})? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.isDeleting.set(true);
    this.saveErrorMessage.set(null);

    this.jobApi
      .deleteJob(selected.job_number)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.jobStore.loadJobs();
          this.closeJobDetails();
        },
        error: () => {
          this.saveErrorMessage.set('Unable to delete job. Please try again.');
        }
      });
  }

  private toJobCardViewModel(job: Job): JobCardViewModel {
    return {
      jobNumber: job.job_number,
      title: job.job_title,
      vacancyLabel: job.is_vacant === 1 ? 'Vacant' : 'Filled',
      vacancyClass: job.is_vacant === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700',
      retainedLabel: job.is_retained === 1 ? 'Retained' : 'Not Retained',
      retainedClass: job.is_retained === 1 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
    };
  }
}
