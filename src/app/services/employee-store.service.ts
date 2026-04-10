import { computed, Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
  CreateEmployeeInput,
  Employee,
  EmployeeLocationFilter,
  EmployeeSortBy,
  EmployeeStatusFilter,
  getTeamMeta,
  EmployeeTeamFilter,
  UpdateEmployeeInput
} from '../models/employee.model';

export type ViewMode = 'directory' | 'appraisals';
export type AppraisalDueDateFilter = 'all' | 'overdue' | 'this-month' | 'this-quarter' | 'this-year';
import { AuthService } from './auth.service';
import { EmployeeApiService } from './employee-api.service';
import { GlobalSearchService } from './global-search.service';
import { ToastService } from './toast.service';

/**
 * Central state store for the employee directory.
 *
 * Responsibilities:
 * - Loads employees from the backend when the user signs in and clears them on logout.
 * - Exposes reactive signals for filter, sort, pagination, and modal state consumed
 *   by directory components.
 * - Proxies create/update calls to EmployeeApiService and reflects the results
 *   immediately in local state so the UI stays in sync without a full reload.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeStoreService {
  private readonly authService = inject(AuthService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly globalSearchService = inject(GlobalSearchService);
  private readonly toastService = inject(ToastService);

  /** Master list of all employees loaded from the backend. */
  private readonly employeesState = signal<Employee[]>([]);
  // Modal visibility and selection state.
  private readonly addEmployeeModalOpenState = signal(false);
  private readonly employeeDetailsModalOpenState = signal(false);
  private readonly selectedEmployeeIdState = signal<string | null>(null);

  // Filter, sort, and pagination state — reset to page 1 on any change.
  private readonly teamFilterState = signal<EmployeeTeamFilter>('all');
  private readonly locationFilterState = signal<EmployeeLocationFilter>('all');
  private readonly statusFilterState = signal<EmployeeStatusFilter>('all');
  private readonly sortByState = signal<EmployeeSortBy>(EmployeeSortBy.RecentlyAdded);
  private readonly currentPageState = signal(1);
  private readonly pageSizeState = signal<number | 'all'>('all');

  // View mode and appraisals-specific filter state.
  private readonly viewModeState = signal<ViewMode>('directory');
  private readonly serviceFilterState = signal<string>('all');
  private readonly gradeFilterState = signal<string>('all');
  private readonly appraisalDueDateFilterState = signal<AppraisalDueDateFilter>('all');

  readonly employees = this.employeesState.asReadonly();
  readonly isAddEmployeeModalOpen = this.addEmployeeModalOpenState.asReadonly();
  readonly isEmployeeDetailsModalOpen = this.employeeDetailsModalOpenState.asReadonly();
  readonly teamFilter = this.teamFilterState.asReadonly();
  readonly locationFilter = this.locationFilterState.asReadonly();
  readonly statusFilter = this.statusFilterState.asReadonly();
  readonly sortBy = this.sortByState.asReadonly();
  readonly pageSize = this.pageSizeState.asReadonly();
  readonly viewMode = this.viewModeState.asReadonly();
  readonly serviceFilter = this.serviceFilterState.asReadonly();
  readonly gradeFilter = this.gradeFilterState.asReadonly();
  readonly appraisalDueDateFilter = this.appraisalDueDateFilterState.asReadonly();
  /** Only admin users may create or edit employees. */
  readonly canAddEmployee = this.authService.isAdmin;
  /** The full employee object for the currently selected details modal entry. */
  readonly selectedEmployeeForDetails = computed(() => {
    const selectedEmployeeId = this.selectedEmployeeIdState();

    if (!selectedEmployeeId) {
      return null;
    }

    return this.employeesState().find((employee) => employee.id === selectedEmployeeId) ?? null;
  });

  /**
   * Derives the filtered and sorted employee list from the master state.
   * Applies team filter, location filter, global search term, and sort order in sequence.
   */
  readonly visibleEmployees = computed(() => {
    const teamFilter = this.teamFilterState();
    const locationFilter = this.locationFilterState();
    const statusFilter = this.statusFilterState();
    const serviceFilter = this.serviceFilterState();
    const gradeFilter = this.gradeFilterState();
    const dueDateFilter = this.appraisalDueDateFilterState();
    const viewMode = this.viewModeState();
    const sortBy = this.sortByState();
    const searchTerm = this.globalSearchService.normalizedSearchTerm();
    const filteredByTeam =
      teamFilter === 'all'
        ? this.employeesState()
        : this.employeesState().filter((employee) => employee.team === teamFilter);

    const filteredByLocation =
      locationFilter === 'all'
        ? filteredByTeam
        : filteredByTeam.filter((employee) => employee.location === locationFilter);

    const filteredByStatus =
      statusFilter === 'all'
        ? filteredByLocation
        : filteredByLocation.filter((employee) => employee.status === statusFilter);

    const filteredByService =
      viewMode !== 'appraisals' || serviceFilter === 'all'
        ? filteredByStatus
        : filteredByStatus.filter((employee) => (employee.service ?? '') === serviceFilter);

    const filteredByGrade =
      viewMode !== 'appraisals' || gradeFilter === 'all'
        ? filteredByService
        : filteredByService.filter((employee) => (employee.grade ?? '') === gradeFilter);

    const filteredByDueDate =
      viewMode !== 'appraisals' || dueDateFilter === 'all'
        ? filteredByGrade
        : filteredByGrade.filter((employee) => {
            const dateStr = employee.appraisalDueDate;
            if (!dateStr) return false;
            const due = new Date(dateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dueDateFilter === 'overdue') return due < today;
            if (dueDateFilter === 'this-month') {
              return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth() && due >= today;
            }
            if (dueDateFilter === 'this-quarter') {
              const q = Math.floor(today.getMonth() / 3);
              const qStart = new Date(today.getFullYear(), q * 3, 1);
              const qEnd = new Date(today.getFullYear(), q * 3 + 3, 0);
              return due >= qStart && due <= qEnd;
            }
            if (dueDateFilter === 'this-year') {
              return due.getFullYear() === today.getFullYear();
            }
            return true;
          });

    const filtered =
      searchTerm.length === 0
        ? filteredByDueDate
        : filteredByDueDate.filter((employee) => {
            const teamLabel = getTeamMeta(employee.team).label;
            const locationLabel = employee.location;

            const searchableText = [
              employee.jobNumber,
              employee.fullName,
              employee.jobTitle,
              teamLabel,
              locationLabel,
              employee.status,
              employee.service ?? '',
              employee.grade ?? ''
            ]
              .join(' ')
              .toLowerCase();

            return searchableText.includes(searchTerm);
          });

    if (sortBy === EmployeeSortBy.NameAscending) {
      return [...filtered].sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    if (sortBy === EmployeeSortBy.Team) {
      return [...filtered].sort((a, b) => a.team.localeCompare(b.team));
    }

    if (sortBy === EmployeeSortBy.AppraisalDate) {
      return [...filtered].sort((a, b) => {
        if (!a.appraisalDueDate && !b.appraisalDueDate) return 0;
        if (!a.appraisalDueDate) return 1;
        if (!b.appraisalDueDate) return -1;
        return a.appraisalDueDate.localeCompare(b.appraisalDueDate);
      });
    }

    return filtered;
  });

  /** Total number of employees loaded from the backend (unfiltered). */
  readonly totalEmployeesCount = computed(() => this.employeesState().length);
  /** Number of employees that match the current filters and search term. */
  readonly visibleEmployeesCount = computed(() => this.visibleEmployees().length);
  readonly availableTeams = computed(() => {
    const uniqueTeams = new Set(
      this.employeesState()
        .map((employee) => employee.team.trim())
        .filter((team) => team.length > 0)
    );

    return [...uniqueTeams].sort((first, second) =>
      getTeamMeta(first).label.localeCompare(getTeamMeta(second).label)
    );
  });

  readonly availableLocations = computed<Array<Exclude<EmployeeLocationFilter, 'all'>>>(() => {
    const uniqueLocations = new Set<Exclude<EmployeeLocationFilter, 'all'>>(
      this.employeesState()
        .map((employee) => employee.location)
        .filter((location): location is Exclude<EmployeeLocationFilter, 'all'> => location.trim().length > 0)
    );

    return [...uniqueLocations].sort((first, second) => first.localeCompare(second));

  });

  readonly availableStatuses = computed<Array<Exclude<EmployeeStatusFilter, 'all'>>>(() => {
    const allowedStatuses: Array<Exclude<EmployeeStatusFilter, 'all'>> = ['active', 'pipeline'];
    const statuses = new Set(
      this.employeesState()
        .map((employee) => employee.status)
        .filter((status): status is Exclude<EmployeeStatusFilter, 'all'> =>
          status === 'active' || status === 'pipeline'
        )
    );

    return allowedStatuses.filter((status) => statuses.has(status));
  });

  readonly availableServices = computed<string[]>(() => {
    const unique = new Set(
      this.employeesState()
        .map((e) => e.service?.trim() ?? '')
        .filter((s) => s.length > 0)
    );
    return [...unique].sort((a, b) => a.localeCompare(b));
  });

  readonly availableGrades = computed<string[]>(() => {
    const unique = new Set(
      this.employeesState()
        .map((e) => e.grade?.trim() ?? '')
        .filter((g) => g.length > 0)
    );
    return [...unique].sort((a, b) => a.localeCompare(b));
  });

  






  readonly totalPages = computed(() => {
    const totalVisible = this.visibleEmployeesCount();
    const pageSize = this.pageSizeState();

    if (pageSize === 'all') {
      return 1;
    }

    return Math.max(1, Math.ceil(totalVisible / pageSize));
  });
  readonly currentPage = computed(() =>
    this.clampPage(this.currentPageState(), this.totalPages())
  );
  readonly pagedEmployees = computed(() => {
    const visible = this.visibleEmployees();
    const pageSize = this.pageSizeState();

    if (pageSize === 'all') {
      return visible;
    }

    const page = this.currentPage();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return visible.slice(start, end);
  });
  readonly currentPageCount = computed(() => this.pagedEmployees().length);
  readonly currentPageStart = computed(() => {
    if (this.visibleEmployeesCount() === 0) {
      return 0;
    }

    const pageSize = this.pageSizeState();

    if (pageSize === 'all') {
      return 1;
    }

    return (this.currentPage() - 1) * pageSize + 1;
  });
  readonly currentPageEnd = computed(() => {
    if (this.visibleEmployeesCount() === 0) {
      return 0;
    }

    return this.currentPageStart() + this.currentPageCount() - 1;
  });

  constructor() {
    // Employees endpoint is public, so hydrate immediately on app startup.
    this.employeeApi.listEmployees().subscribe({
      next: (employees) => {
        this.employeesState.set(employees);
        this.currentPageState.set(1);
      },
      error: () => {
        this.employeesState.set([]);
        this.currentPageState.set(1);
      }
    });
  }

  openAddEmployeeModal(): void {
    if (!this.canAddEmployee()) {
      this.addEmployeeModalOpenState.set(false);
      return;
    }

    this.addEmployeeModalOpenState.set(true);
  }

  closeAddEmployeeModal(): void {
    this.addEmployeeModalOpenState.set(false);
  }

  openEmployeeDetailsModal(employeeId: string): void {
    if (!this.canAddEmployee()) {
      this.employeeDetailsModalOpenState.set(false);
      this.selectedEmployeeIdState.set(null);
      return;
    }

    this.selectedEmployeeIdState.set(employeeId);
    this.employeeDetailsModalOpenState.set(true);
  }

  closeEmployeeDetailsModal(): void {
    this.employeeDetailsModalOpenState.set(false);
    this.selectedEmployeeIdState.set(null);
  }

  setTeamFilter(filter: EmployeeTeamFilter): void {
    this.teamFilterState.set(filter);
    this.currentPageState.set(1);
  }

  setLocationFilter(filter: EmployeeLocationFilter): void {
    this.locationFilterState.set(filter);
    this.currentPageState.set(1);
  }

  setStatusFilter(filter: EmployeeStatusFilter): void {
    this.statusFilterState.set(filter);
    this.currentPageState.set(1);
  }

  setSortBy(sortBy: EmployeeSortBy): void {
    this.sortByState.set(sortBy);
    this.currentPageState.set(1);
  }

  setViewMode(mode: ViewMode): void {
    this.viewModeState.set(mode);
    this.currentPageState.set(1);
  }

  setServiceFilter(filter: string): void {
    this.serviceFilterState.set(filter);
    this.currentPageState.set(1);
  }

  setGradeFilter(filter: string): void {
    this.gradeFilterState.set(filter);
    this.currentPageState.set(1);
  }

  setAppraisalDueDateFilter(filter: AppraisalDueDateFilter): void {
    this.appraisalDueDateFilterState.set(filter);
    this.currentPageState.set(1);
  }

  setPageSize(pageSize: number | 'all'): void {
    this.pageSizeState.set(pageSize);
    this.currentPageState.set(1);
  }

  setPage(page: number): void {
    this.currentPageState.set(this.clampPage(page, this.totalPages()));
  }

  nextPage(): void {
    this.setPage(this.currentPage() + 1);
  }

  previousPage(): void {
    this.setPage(this.currentPage() - 1);
  }

  /**
   * Sends a create request to the backend and prepends the returned employee
   * to the local state on success. Guards against non-admin callers.
   */
  addEmployee(input: CreateEmployeeInput): Observable<void> {
    if (!this.canAddEmployee()) {
      this.closeAddEmployeeModal();
      return of(void 0);
    }

    const payload: CreateEmployeeInput = {
      ...input,
      avatarUrl: input.avatarUrl || this.defaultAvatarUrl()
    };

    return this.employeeApi.createEmployee(payload).pipe(
      tap((createdEmployee) => {
        this.employeesState.update((current) => [createdEmployee, ...current]);
        this.currentPageState.set(1);
        this.closeAddEmployeeModal();
        this.toastService.showSuccess(`Added ${createdEmployee.fullName} to the directory.`);
      }),
      map(() => void 0)
    );
  }

  /**
   * Sends a PATCH request to the backend and replaces the matching employee
   * in local state with the returned updated record on success.
   */
  updateEmployeeDetails(employeeId: string, input: UpdateEmployeeInput): Observable<void> {
    if (!this.canAddEmployee()) {
      this.closeEmployeeDetailsModal();
      return of(void 0);
    }

    const employee = this.employeesState().find((entry) => entry.id === employeeId);

    if (!employee) {
      return of(void 0);
    }

    const payload: UpdateEmployeeInput = {
      ...input,
      avatarUrl: input.avatarUrl || this.defaultAvatarUrl()
    };

    return this.employeeApi.updateEmployee(employeeId, payload).pipe(
      tap((updatedEmployee) => {
        this.employeesState.update((current) =>
          current.map((entry) => (entry.id === employeeId ? updatedEmployee : entry))
        );

        this.closeEmployeeDetailsModal();
        this.toastService.showSuccess(`Updated ${updatedEmployee.fullName}.`);
      }),
      map(() => void 0)
    );
  }

  /**
   * Deletes an employee on the backend and removes the same record from local state.
   */
  deleteEmployee(employeeId: string): Observable<void> {
    if (!this.canAddEmployee()) {
      this.closeEmployeeDetailsModal();
      return of(void 0);
    }

    const employee = this.employeesState().find((entry) => entry.id === employeeId);

    if (!employee) {
      return of(void 0);
    }

    return this.employeeApi.deleteEmployee(employeeId).pipe(
      tap(() => {
        this.employeesState.update((current) =>
          current.filter((entry) => entry.id !== employeeId)
        );

        const nextTotalPages = this.totalPages();
        this.currentPageState.set(this.clampPage(this.currentPageState(), nextTotalPages));
        this.closeEmployeeDetailsModal();
        this.toastService.showSuccess(`Removed ${employee.fullName} from the directory.`);
      }),
      map(() => void 0)
    );
  }

  private defaultAvatarUrl(): string {
    return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80';
  }

  /** Ensures the requested page number stays within the valid 1..totalPages range. */
  private clampPage(page: number, totalPages: number): number {
    if (page < 1) {
      return 1;
    }

    if (page > totalPages) {
      return totalPages;
    }

    return page;
  }
}
