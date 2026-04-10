import { TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { of } from 'rxjs';

import { Employee } from '../../models/employee.model';
import { Nomination } from '../../models/nomination.model';
import { NominationsPageComponent } from './nominations-page.component';
import { AuthService } from '../../services/auth.service';
import { EmployeeStoreService } from '../../services/employee-store.service';
import { NominationApiService } from '../../services/nomination-api.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    jobNumber: 'J001',
    fullName: 'Test Employee',
    jobTitle: 'Engineer',
    team: 'engineering',
    location: 'north',
    avatarUrl: '',
    status: 'active',
    ...overrides,
  };
}

function makeNomination(overrides: Partial<Nomination> = {}): Nomination {
  return {
    id: 1,
    nominatorName: 'Alice',
    nominatorTeam: 'Engineering',
    nomineeEmployeeId: 'emp-1',
    nomineeName: 'Bob',
    nominationText: 'Outstanding contribution to the team every day.',
    createdAt: '2025-04-15T09:00:00',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NominationsPageComponent', () => {
  let component: NominationsPageComponent;
  let mockEmployeesSignal: WritableSignal<Employee[]>;

  beforeEach(async () => {
    mockEmployeesSignal = signal<Employee[]>([]);

    await TestBed.configureTestingModule({
      imports: [NominationsPageComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { isAdmin: signal(false) },
        },
        {
          provide: EmployeeStoreService,
          useValue: { employees: mockEmployeesSignal },
        },
        {
          provide: NominationApiService,
          useValue: {
            submitNomination: jasmine.createSpy('submitNomination').and.returnValue(of(null)),
            listNominations: jasmine.createSpy('listNominations').and.returnValue(of([])),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NominationsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── canSubmit ─────────────────────────────────────────────────────────────

  describe('canSubmit', () => {
    it('is false when all fields are empty', () => {
      expect(component.canSubmit).toBeFalse();
    });

    it('is false when nominatorName is empty', () => {
      component.nominatorName = '';
      component.nominatorTeam = 'Engineering';
      component.nomineeEmployeeId = 'emp-1';
      component.nominationText = 'A remarkable colleague who always helps everyone around them.';
      expect(component.canSubmit).toBeFalse();
    });

    it('is false when nominatorName is whitespace only', () => {
      component.nominatorName = '   ';
      component.nominatorTeam = 'Engineering';
      component.nomineeEmployeeId = 'emp-1';
      component.nominationText = 'A remarkable colleague who always helps everyone around them.';
      expect(component.canSubmit).toBeFalse();
    });

    it('is false when nominatorTeam is empty', () => {
      component.nominatorName = 'Alex';
      component.nominatorTeam = '';
      component.nomineeEmployeeId = 'emp-1';
      component.nominationText = 'A remarkable colleague who always helps everyone around them.';
      expect(component.canSubmit).toBeFalse();
    });

    it('is false when nominatorTeam is whitespace only', () => {
      component.nominatorName = 'Alex';
      component.nominatorTeam = '   ';
      component.nomineeEmployeeId = 'emp-1';
      component.nominationText = 'A remarkable colleague who always helps everyone around them.';
      expect(component.canSubmit).toBeFalse();
    });

    it('is false when no nominee is selected', () => {
      component.nominatorName = 'Alex';
      component.nominatorTeam = 'Engineering';
      component.nomineeEmployeeId = '';
      component.nominationText = 'A remarkable colleague who always helps everyone around them.';
      expect(component.canSubmit).toBeFalse();
    });

    it('is false when nominationText is fewer than 10 characters', () => {
      component.nominatorName = 'Alex';
      component.nominatorTeam = 'Engineering';
      component.nomineeEmployeeId = 'emp-1';
      component.nominationText = 'Too short'; // 9 chars
      expect(component.canSubmit).toBeFalse();
    });

    it('is false when nominationText is exactly 9 characters', () => {
      component.nominatorName = 'Alex';
      component.nominatorTeam = 'Engineering';
      component.nomineeEmployeeId = 'emp-1';
      component.nominationText = '123456789'; // 9 chars
      expect(component.canSubmit).toBeFalse();
    });

    it('is false when nominationText is whitespace only', () => {
      component.nominatorName = 'Alex';
      component.nominatorTeam = 'Engineering';
      component.nomineeEmployeeId = 'emp-1';
      component.nominationText = '          '; // 10 spaces – trims to ""
      expect(component.canSubmit).toBeFalse();
    });

    it('is true when nominationText is exactly 10 non-whitespace characters', () => {
      component.nominatorName = 'Alex';
      component.nominatorTeam = 'Engineering';
      component.nomineeEmployeeId = 'emp-1';
      component.nominationText = '1234567890'; // exactly 10 chars
      expect(component.canSubmit).toBeTrue();
    });

    it('is true when all fields are filled with valid data', () => {
      component.nominatorName = 'Alex Johnson';
      component.nominatorTeam = 'Engineering';
      component.nomineeEmployeeId = 'emp-1';
      component.nominationText = 'This person consistently goes above and beyond for the team.';
      expect(component.canSubmit).toBeTrue();
    });
  });

  // ── filteredEmployees ─────────────────────────────────────────────────────

  describe('filteredEmployees', () => {
    beforeEach(() => {
      mockEmployeesSignal.set([
        makeEmployee({ id: '1', fullName: 'Alice Smith', jobTitle: 'Senior Engineer', status: 'active' }),
        makeEmployee({ id: '2', fullName: 'Bob Jones', jobTitle: 'Designer', status: 'active' }),
        makeEmployee({ id: '3', fullName: 'Charlie Davis', jobTitle: 'Engineer', status: 'pipeline' }),
      ]);
    });

    it('returns only active employees when filter text is empty', () => {
      component.onEmployeeFilterChange('');
      const result = component.filteredEmployees();
      expect(result.length).toBe(2);
      expect(result.every((e) => e.status === 'active')).toBeTrue();
    });

    it('filters active employees by full name (case-insensitive)', () => {
      component.onEmployeeFilterChange('alice');
      const result = component.filteredEmployees();
      expect(result.length).toBe(1);
      expect(result[0].fullName).toBe('Alice Smith');
    });

    it('filters active employees by job title (case-insensitive)', () => {
      component.onEmployeeFilterChange('designer');
      const result = component.filteredEmployees();
      expect(result.length).toBe(1);
      expect(result[0].fullName).toBe('Bob Jones');
    });

    it('returns empty array when filter matches no active employee', () => {
      component.onEmployeeFilterChange('zzz-nobody');
      expect(component.filteredEmployees().length).toBe(0);
    });

    it('does not return pipeline employees even when the filter matches their name', () => {
      component.onEmployeeFilterChange('Charlie');
      expect(component.filteredEmployees().length).toBe(0);
    });
  });

  // ── filteredNominations ───────────────────────────────────────────────────

  describe('filteredNominations', () => {
    beforeEach(() => {
      component.nominations.set([
        makeNomination({ id: 1, createdAt: '2025-03-10T00:00:00' }),
        makeNomination({ id: 2, createdAt: '2025-03-20T00:00:00' }),
        makeNomination({ id: 3, createdAt: '2025-04-05T00:00:00' }),
      ]);
    });

    it('returns all nominations when month filter is "all"', () => {
      component.setMonthFilter('all');
      expect(component.filteredNominations().length).toBe(3);
    });

    it('returns only nominations whose createdAt starts with the selected YYYY-MM', () => {
      component.setMonthFilter('2025-03');
      const result = component.filteredNominations();
      expect(result.length).toBe(2);
      expect(result.every((n) => n.createdAt.startsWith('2025-03'))).toBeTrue();
    });

    it('returns empty array when selected month has no nominations', () => {
      component.setMonthFilter('2025-01');
      expect(component.filteredNominations().length).toBe(0);
    });
  });

  // ── availableMonths ───────────────────────────────────────────────────────

  describe('availableMonths', () => {
    it('returns unique YYYY-MM keys sorted newest first', () => {
      component.nominations.set([
        makeNomination({ id: 1, createdAt: '2025-01-10T00:00:00' }),
        makeNomination({ id: 2, createdAt: '2025-03-05T00:00:00' }),
        makeNomination({ id: 3, createdAt: '2025-03-20T00:00:00' }),
      ]);
      const months = component.availableMonths();
      expect(months).toEqual(['2025-03', '2025-01']);
    });

    it('returns an empty array when there are no nominations', () => {
      component.nominations.set([]);
      expect(component.availableMonths()).toEqual([]);
    });
  });

  // ── formatMonthLabel ──────────────────────────────────────────────────────

  describe('formatMonthLabel', () => {
    it('converts YYYY-MM to a human-readable month and year', () => {
      const label = component.formatMonthLabel('2025-04');
      expect(label).toContain('2025');
      expect(label.toLowerCase()).toContain('april');
    });

    it('returns a string (no throw) when value cannot be parsed', () => {
      const label = component.formatMonthLabel('not-a-date');
      expect(typeof label).toBe('string');
    });
  });
});
