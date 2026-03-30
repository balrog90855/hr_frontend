import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { EmployeeStoreService } from '../../services/employee-store.service';

/** A page number or the 'ellipsis' sentinel used to render '...' gaps in the page range. */
type PaginationItem = number | 'ellipsis';

/**
 * Footer bar showing record counts and page navigation controls.
 * Builds a smart page-number list that shows ellipsis gaps for large page counts.
 */
@Component({
  selector: 'app-pagination-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination-footer.component.html'
})
export class PaginationFooterComponent {
  private readonly employeeStore = inject(EmployeeStoreService);

  readonly currentPage = this.employeeStore.currentPage;
  readonly totalPages = this.employeeStore.totalPages;
  readonly currentPageStart = this.employeeStore.currentPageStart;
  readonly currentPageEnd = this.employeeStore.currentPageEnd;
  readonly visibleEmployeesCount = this.employeeStore.visibleEmployeesCount;
  readonly totalEmployeesCount = this.employeeStore.totalEmployeesCount;

  /**
   * Computes the list of page items to render.
   * Shows up to 5 pages directly; uses ellipsis sentinels for larger ranges
   * to keep the control compact.
   */
  readonly pageItems = computed<PaginationItem[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 5) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 'ellipsis', total];
    }

    if (current >= total - 2) {
      return [1, 'ellipsis', total - 2, total - 1, total];
    }

    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
  });

  previousPage(): void {
    this.employeeStore.previousPage();
  }

  nextPage(): void {
    this.employeeStore.nextPage();
  }

  setPage(page: number): void {
    this.employeeStore.setPage(page);
  }

  isPageNumber(item: PaginationItem): item is number {
    return typeof item === 'number';
  }
}
