import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateEmployeeInput,
  DEFAULT_EMPLOYEE_LOCATION,
  Employee,
  EmployeeLocation,
  UpdateEmployeeInput
} from '../models/employee.model';

interface BackendEmployee {
  id?: string | number;
  employee_id?: string | number;
  job_number?: string;
  full_name?: string;
  job_title?: string;
  team?: string;
  location?: string;
  avatar_url?: string;
  status?: string;
  service?: string;
  grade?: string;
  appraisal_due_date?: string;
  expected_start?: string;
  fad?: string;
}

/** Accepts both a plain array and pagination-wrapped envelope responses from the API. */
type BackendEmployeeListResponse =
  | BackendEmployee[]
  | {
      items?: BackendEmployee[];
      results?: BackendEmployee[];
      data?: BackendEmployee[];
    };

/**
 * Thin HTTP client for the /api/employees resource.
 *
 * Handles serialisation of Angular Employee objects to the backend's
 * snake_case payload format and deserialisation of backend responses
 * back into typed Employee objects.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeApiService {
  /** Base URL for all employee API calls derived from the active environment config. */
  private readonly employeesUrl = `${environment.apiBaseUrl}/employees`;

  constructor(private readonly http: HttpClient) {}

  /** Fetches a page of employees. Defaults to 500 to load the full set on initial login. */
  listEmployees(limit = 500, offset = 0): Observable<Employee[]> {
    const params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset));

    return this.http
      .get<BackendEmployeeListResponse>(this.employeesUrl, { params })
      .pipe(map((response) => this.extractEmployeeList(response).map((employee) => this.toEmployee(employee))));
  }

  /** Posts a new employee record to POST /api/employees and returns the created entity. */
  createEmployee(input: CreateEmployeeInput): Observable<Employee> {
    return this.http
      .post<BackendEmployee>(this.employeesUrl, this.toCreatePayload(input))
      .pipe(map((employee) => this.toEmployee(employee)));
  }

  /** Sends a partial update via PATCH /api/employees/{id} and returns the updated entity. */
  updateEmployee(employeeId: string, input: UpdateEmployeeInput): Observable<Employee> {
    return this.http
      .patch<BackendEmployee>(`${this.employeesUrl}/${employeeId}`, this.toUpdatePayload(input))
      .pipe(map((employee) => this.toEmployee(employee)));
  }

  /** Deletes an employee via DELETE /api/employees/{id}. */
  deleteEmployee(employeeId: string): Observable<void> {
    return this.http.delete<void>(`${this.employeesUrl}/${employeeId}`);
  }

  /** Unwraps either a plain array or a paginated envelope object into a flat array. */
  private extractEmployeeList(response: BackendEmployeeListResponse): BackendEmployee[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.items ?? response.results ?? response.data ?? [];
  }

  /** Maps a raw backend employee record to the app's Employee interface. */
  private toEmployee(employee: BackendEmployee): Employee {
    const id = String(employee.id ?? employee.employee_id ?? `emp-${Date.now()}`);

    return {
      id,
      jobNumber: employee.job_number ?? id,
      fullName: employee.full_name ?? 'Unknown Employee',
      jobTitle: employee.job_title ?? 'Unknown Role',
      team: this.toEmployeeTeamName(employee.team),
      location: this.toEmployeeLocation(employee.location),
      avatarUrl: employee.avatar_url ?? this.defaultAvatarUrl(),
      status: this.toEmployeeStatus(employee.status),
      service: employee.service ?? undefined,
      grade: employee.grade ?? undefined,
      appraisalDueDate: employee.appraisal_due_date ?? undefined,
      expectedStartDate: employee.expected_start ?? undefined,
      fad: employee.fad ?? undefined
    };
  }

  /** Converts a CreateEmployeeInput to the snake_case payload the backend expects. */
  private toCreatePayload(input: CreateEmployeeInput): Record<string, string> {
    return {
      job_number: input.jobNumber,
      full_name: input.fullName,
      job_title: input.jobTitle,
      team: input.team,
      location: input.location.trim(),
      avatar_url: input.avatarUrl ?? '',
      status: input.status,
      ...(input.service ? { service: input.service } : {}),
      ...(input.grade ? { grade: input.grade } : {}),
      ...(input.appraisalDueDate ? { appraisal_due_date: input.appraisalDueDate } : {}),
      ...(input.expectedStartDate ? { expected_start: input.expectedStartDate } : {}),
      ...(input.fad ? { fad: input.fad } : {})
    };
  }

  /** Converts an UpdateEmployeeInput to the snake_case payload the backend expects. */
  private toUpdatePayload(input: UpdateEmployeeInput): Record<string, string> {
    return {
      job_number: input.jobNumber,
      full_name: input.fullName,
      job_title: input.jobTitle,
      team: input.team,
      location: input.location.trim(),
      avatar_url: input.avatarUrl ?? '',
      status: input.status,
      ...(input.service !== undefined ? { service: input.service } : {}),
      ...(input.grade !== undefined ? { grade: input.grade } : {}),
      ...(input.appraisalDueDate !== undefined ? { appraisal_due_date: input.appraisalDueDate } : {}),
      ...(input.expectedStartDate !== undefined ? { expected_start: input.expectedStartDate } : {}),
      ...(input.fad !== undefined ? { fad: input.fad } : {})
    };
  }

  private toEmployeeTeamName(value: string | undefined): string {
    const normalized = value?.trim();

    if (!normalized) {
      return 'unassigned';
    }

    return normalized;
  }

  private toEmployeeLocation(value: string | undefined): EmployeeLocation {
    const normalized = value?.trim();

    if (!normalized) {
      return DEFAULT_EMPLOYEE_LOCATION;
    }

    return normalized;
  }

  private toEmployeeStatus(value: string | undefined): Employee['status'] {
    const normalized = value?.trim().toLowerCase();

    if (normalized === 'pipeline') {
      return 'pipeline';
    }

    if (normalized === 'away') {
      return 'away';
    }

    if (normalized === 'offline') {
      return 'offline';
    }

    return 'active';
  }

  private defaultAvatarUrl(): string {
    return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80';
  }
}
