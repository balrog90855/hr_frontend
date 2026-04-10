import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { AddEmployeeModalComponent } from './add-employee-modal.component';
import { EmployeeStoreService } from '../../services/employee-store.service';
import { JobStoreService } from '../../services/job-store.service';

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

function makeMockEmployeeStore() {
  return {
    isAddEmployeeModalOpen: signal(false),
    canAddEmployee: signal(true),
    availableTeams: signal(['engineering', 'design', 'product']),
    availableLocations: signal(['north', 'south']),
    availableServices: signal(['service-a']),
    availableGrades: signal(['grade-1', 'grade-2']),
    employees: signal([]),
    addEmployee: jasmine.createSpy('addEmployee').and.returnValue(of(null)),
    closeAddEmployeeModal: jasmine.createSpy('closeAddEmployeeModal'),
  };
}

function makeMockJobStore() {
  return {
    jobs: signal([
      { job_number: 'J001', job_title: 'Software Engineer', is_vacant: 1 },
    ]),
    isLoading: signal(false),
    loadJobs: jasmine.createSpy('loadJobs'),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AddEmployeeModalComponent – save() validation', () => {
  let component: AddEmployeeModalComponent;
  let mockEmployeeStore: ReturnType<typeof makeMockEmployeeStore>;
  let mockJobStore: ReturnType<typeof makeMockJobStore>;

  beforeEach(async () => {
    mockEmployeeStore = makeMockEmployeeStore();
    mockJobStore = makeMockJobStore();

    await TestBed.configureTestingModule({
      imports: [AddEmployeeModalComponent],
      providers: [
        { provide: EmployeeStoreService, useValue: mockEmployeeStore },
        { provide: JobStoreService, useValue: mockJobStore },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AddEmployeeModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillValidForm(): void {
    component.formData.fullName = 'Jane Doe';
    component.formData.jobNumber = 'J001';
    component.formData.team = 'engineering';
    component.formData.location = 'north';
    component.formData.status = 'active';
  }

  it('does not call addEmployee when fullName is empty', () => {
    fillValidForm();
    component.formData.fullName = '';
    component.save();
    expect(mockEmployeeStore.addEmployee).not.toHaveBeenCalled();
  });

  it('does not call addEmployee when fullName is whitespace only', () => {
    fillValidForm();
    component.formData.fullName = '   ';
    component.save();
    expect(mockEmployeeStore.addEmployee).not.toHaveBeenCalled();
  });

  it('does not call addEmployee when jobNumber is empty', () => {
    fillValidForm();
    component.formData.jobNumber = '';
    component.save();
    expect(mockEmployeeStore.addEmployee).not.toHaveBeenCalled();
  });

  it('does not call addEmployee when jobNumber does not match a job in the list', () => {
    fillValidForm();
    component.formData.jobNumber = 'DOES-NOT-EXIST';
    component.save();
    expect(mockEmployeeStore.addEmployee).not.toHaveBeenCalled();
  });

  it('does not call addEmployee when team is empty', () => {
    fillValidForm();
    component.formData.team = '';
    component.save();
    expect(mockEmployeeStore.addEmployee).not.toHaveBeenCalled();
  });

  it('does not call addEmployee when team is whitespace only', () => {
    fillValidForm();
    component.formData.team = '   ';
    component.save();
    expect(mockEmployeeStore.addEmployee).not.toHaveBeenCalled();
  });

  it('does not call addEmployee when location is empty', () => {
    fillValidForm();
    component.formData.location = '';
    component.save();
    expect(mockEmployeeStore.addEmployee).not.toHaveBeenCalled();
  });

  it('does not call addEmployee when location is whitespace only', () => {
    fillValidForm();
    component.formData.location = '   ';
    component.save();
    expect(mockEmployeeStore.addEmployee).not.toHaveBeenCalled();
  });

  it('calls addEmployee when all required fields are valid', () => {
    fillValidForm();
    component.save();
    expect(mockEmployeeStore.addEmployee).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        fullName: 'Jane Doe',
        jobNumber: 'J001',
        team: 'engineering',
        location: 'north',
      })
    );
  });

  it('does not call addEmployee when canAddEmployee is false', () => {
    mockEmployeeStore.canAddEmployee.set(false);
    fillValidForm();
    component.save();
    expect(mockEmployeeStore.addEmployee).not.toHaveBeenCalled();
  });
});
