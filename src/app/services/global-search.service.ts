import { Injectable, computed, signal } from '@angular/core';

/**
 * Manages the global search term entered in the top header.
 * The normalised term is consumed by EmployeeStoreService to filter the directory.
 */
@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly searchTermState = signal('');

  /** Raw search term as typed by the user. Bound to the header input value. */
  readonly searchTerm = this.searchTermState.asReadonly();
  /** Trimmed and lowercased version used for case-insensitive substring matching. */
  readonly normalizedSearchTerm = computed(() => this.searchTermState().trim().toLowerCase());

  setSearchTerm(value: string): void {
    this.searchTermState.set(value);
  }

  /** Resets the search term; called on navigation or logout. */
  clear(): void {
    this.searchTermState.set('');
  }
}
