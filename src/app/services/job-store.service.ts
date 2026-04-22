import { computed, Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { Job } from '../models/job.model';
import { JobApiService } from './job-api.service';

@Injectable({ providedIn: 'root' })
export class JobStoreService {
  private readonly jobApi = inject(JobApiService);
  private readonly storageKey = 'talent-network.jobs';

  private readonly jobsState = signal<Job[]>([]);
  private readonly isLoadingState = signal(false);
  private readonly hasInitialisedForSessionState = signal(false);
  private readonly createJobModalRequestedState = signal(false);

  readonly jobs = this.jobsState.asReadonly();
  readonly isLoading = this.isLoadingState.asReadonly();
  readonly isCreateJobModalRequested = this.createJobModalRequestedState.asReadonly();
  readonly vacantJobs = computed(() =>
    this.jobsState().filter((job) => job.is_vacant === 1)
  );

  constructor() {
    if (!this.hasInitialisedForSessionState()) {
      this.hasInitialisedForSessionState.set(true);
      const cachedJobs = this.readFromStorage<Job[]>(this.storageKey);
      if (cachedJobs && cachedJobs.length > 0) {
        this.jobsState.set(cachedJobs);
      }

      // Always refresh in the background after hydration so cache stays current.
      this.loadJobs();
    }
  }

  loadJobs(): void {
    this.isLoadingState.set(true);
    this.jobApi
      .listJobs(500, 0, false)
      .pipe(finalize(() => this.isLoadingState.set(false)))
      .subscribe({
        next: (jobs) => {
          this.jobsState.set(jobs);
          this.saveToStorage(this.storageKey, jobs);
        },
        error: () => this.jobsState.set([])
      });
  }

  requestCreateJobModal(): void {
    this.createJobModalRequestedState.set(true);
  }

  consumeCreateJobModalRequest(): void {
    this.createJobModalRequestedState.set(false);
  }

  private readFromStorage<T>(key: string): T | null {
    try {
      const rawValue = localStorage.getItem(key);

      if (!rawValue) {
        return null;
      }

      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  private saveToStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }
}