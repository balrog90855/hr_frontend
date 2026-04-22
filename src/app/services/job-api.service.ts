import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Job } from '../models/job.model';

interface BackendJob {
  job_number?: string;
  job_title?: string;
  is_vacant?: number;
  is_retained?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateJobPayload {
  job_number: string;
  job_title: string;
  is_retained?: number;
}

export interface UpdateJobPayload {
  job_title?: string;
  is_retained?: number;
}

type BackendJobListResponse =
  | BackendJob[]
  | {
      items?: BackendJob[];
      results?: BackendJob[];
      data?: BackendJob[];
    };

@Injectable({ providedIn: 'root' })
export class JobApiService {
  private readonly jobsUrl = `${environment.apiBaseUrl}/jobs`;

  constructor(private readonly http: HttpClient) {}

  listJobs(limit = 500, offset = 0, vacantOnly = false): Observable<Job[]> {
    const params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset))
      .set('vacant_only', String(vacantOnly));

    return this.http
      .get<BackendJobListResponse>(this.jobsUrl, { params })
      .pipe(map((response) => this.extractJobList(response).map((job) => this.toJob(job))));
  }

  getJob(jobNumber: string): Observable<Job> {
    return this.http
      .get<BackendJob>(`${this.jobsUrl}/${encodeURIComponent(jobNumber)}`)
      .pipe(map((job) => this.toJob(job)));
  }

  createJob(payload: CreateJobPayload): Observable<Job> {
    return this.http
      .post<BackendJob>(this.jobsUrl, payload)
      .pipe(map((job) => this.toJob(job)));
  }

  updateJob(jobNumber: string, payload: UpdateJobPayload): Observable<Job> {
    return this.http
      .patch<BackendJob>(`${this.jobsUrl}/${encodeURIComponent(jobNumber)}`, payload)
      .pipe(map((job) => this.toJob(job)));
  }

  deleteJob(jobNumber: string): Observable<void> {
    return this.http.delete<void>(`${this.jobsUrl}/${encodeURIComponent(jobNumber)}`);
  }

  private extractJobList(response: BackendJobListResponse): BackendJob[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.items ?? response.results ?? response.data ?? [];
  }

  private toJob(job: BackendJob): Job {
    return {
      job_number: job.job_number ?? '',
      job_title: job.job_title ?? 'Untitled Role',
      is_vacant: Number(job.is_vacant ?? 0),
      is_retained: Number(job.is_retained ?? 0),
      created_at: job.created_at ?? '',
      updated_at: job.updated_at ?? ''
    };
  }
}