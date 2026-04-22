import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Nomination } from '../../models/nomination.model';
import { AuthService } from '../../services/auth.service';
import { EmployeeStoreService } from '../../services/employee-store.service';
import { NominationApiService } from '../../services/nomination-api.service';

type AdminTab = 'submit' | 'received';

@Component({
  selector: 'app-nominations-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nominations-page.component.html',
})
export class NominationsPageComponent {
  readonly nominationMinLength = 10;
  private readonly authService = inject(AuthService);
  private readonly employeeStore = inject(EmployeeStoreService);
  private readonly nominationApi = inject(NominationApiService);

  readonly isAdmin = this.authService.isAdmin;

  // ── Admin tab toggle ──────────────────────────────────────────────────────
  readonly adminTab = signal<AdminTab>('submit');

  setAdminTab(tab: AdminTab): void {
    this.adminTab.set(tab);
  }

  // ── Employee list for nominee selector ───────────────────────────────────
  readonly allEmployees = this.employeeStore.employees;
  readonly activeEmployees = computed(() =>
    this.allEmployees().filter((e) => e.status === 'active')
  );

  readonly employeeFilterText = signal('');

  readonly filteredEmployees = computed(() => {
    const term = this.employeeFilterText().trim().toLowerCase();
    if (!term) return this.activeEmployees();
    return this.activeEmployees().filter(
      (e) =>
        e.fullName.toLowerCase().includes(term) ||
        (e.jobTitle ?? '').toLowerCase().includes(term)
    );
  });

  onEmployeeFilterChange(value: string): void {
    this.employeeFilterText.set(value);
  }

  // ── Submission form ───────────────────────────────────────────────────────
  nominatorName = '';
  nominatorTeam = '';
  nomineeEmployeeId = '';
  nominationText = '';

  readonly nominationTextLength = computed(() => this.nominationText.trim().length);
  readonly hasEnoughNominationText = computed(
    () => this.nominationTextLength() >= this.nominationMinLength
  );

  readonly isSubmitting = signal(false);
  readonly submitSuccess = signal(false);
  readonly submitError = signal<string | null>(null);

  get canSubmit(): boolean {
    return (
      this.nominatorName.trim().length > 0 &&
      this.nominatorTeam.trim().length > 0 &&
      this.nomineeEmployeeId.length > 0 &&
      this.nominationText.trim().length >= this.nominationMinLength &&
      !this.isSubmitting()
    );
  }

  submitNomination(): void {
    if (!this.canSubmit) return;
    this.isSubmitting.set(true);
    this.submitError.set(null);

    this.nominationApi
      .submitNomination({
        nominatorName: this.nominatorName.trim(),
        nominatorTeam: this.nominatorTeam.trim(),
        nomineeEmployeeId: this.nomineeEmployeeId,
        nominationText: this.nominationText.trim(),
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.submitSuccess.set(true);
          this.nominatorName = '';
          this.nominatorTeam = '';
          this.nomineeEmployeeId = '';
          this.nominationText = '';
          this.employeeFilterText.set('');
          // If admin submitted, refresh the received list and switch to it
          if (this.isAdmin()) {
            this.loadNominations();
            this.adminTab.set('received');
          }
        },
        error: (err) => {
          const msg: string =
            err?.error?.detail ?? err?.message ?? 'Failed to submit nomination.';
          this.submitError.set(msg);
        },
      });
  }

  resetSuccess(): void {
    this.submitSuccess.set(false);
  }

  // ── Admin received list ───────────────────────────────────────────────────
  readonly nominations = signal<Nomination[]>([]);
  readonly isLoadingNominations = signal(false);
  readonly monthFilter = signal<string>('all');

  readonly selectedNomination = signal<Nomination | null>(null);

  /** Unique YYYY-MM keys present in the nominations list, newest first. */
  readonly availableMonths = computed(() => {
    const seen = new Set<string>();
    for (const n of this.nominations()) {
      const key = n.createdAt.slice(0, 7);
      seen.add(key);
    }
    return Array.from(seen).sort((a, b) => b.localeCompare(a));
  });

  readonly filteredNominations = computed(() => {
    const month = this.monthFilter();
    if (month === 'all') return this.nominations();
    return this.nominations().filter((n) => n.createdAt.startsWith(month));
  });

  setMonthFilter(value: string): void {
    this.monthFilter.set(value);
  }

  formatMonthLabel(yyyyMM: string): string {
    try {
      const [year, month] = yyyyMM.split('-');
      return new Date(Number(year), Number(month) - 1, 1).toLocaleString(undefined, {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return yyyyMM;
    }
  }

  constructor() {
    effect(() => {
      if (this.isAdmin()) {
        this.loadNominations();
      }
    }, { allowSignalWrites: true });
  }

  loadNominations(): void {
    this.isLoadingNominations.set(true);
    this.nominationApi
      .listNominations()
      .pipe(finalize(() => this.isLoadingNominations.set(false)))
      .subscribe({
        next: (list) => this.nominations.set(list),
        error: () => this.nominations.set([]),
      });
  }

  openNomination(nomination: Nomination): void {
    this.selectedNomination.set(nomination);
  }

  closeNomination(): void {
    this.selectedNomination.set(null);
  }

  onModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeNomination();
    }
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
