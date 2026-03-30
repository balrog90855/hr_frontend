import { Injectable, signal } from '@angular/core';
import { EmployeeLocationFilter } from '../models/employee.model';

type PipelineSectionView = 'both' | 'pipeline' | 'vacancies';
type PipelineTeamFilter = string | 'all';

/**
 * Persists pipeline page filter state across navigation.
 * Provided at root so signal values survive component destroy/recreate cycles.
 */
@Injectable({ providedIn: 'root' })
export class PipelineStoreService {
  private readonly sectionViewState = signal<PipelineSectionView>('both');
  private readonly teamFilterState = signal<PipelineTeamFilter>('all');
  private readonly locationFilterState = signal<EmployeeLocationFilter>('all');

  readonly sectionView = this.sectionViewState.asReadonly();
  readonly teamFilter = this.teamFilterState.asReadonly();
  readonly locationFilter = this.locationFilterState.asReadonly();

  setSectionView(value: PipelineSectionView): void {
    this.sectionViewState.set(value);
  }

  setTeamFilter(value: PipelineTeamFilter): void {
    this.teamFilterState.set(value);
  }

  setLocationFilter(value: EmployeeLocationFilter): void {
    this.locationFilterState.set(value);
  }
}
