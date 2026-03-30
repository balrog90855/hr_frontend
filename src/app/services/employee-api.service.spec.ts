import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmployeeApiService } from './employee-api.service';

describe('EmployeeApiService', () => {
  let service: EmployeeApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), EmployeeApiService]
    });

    service = TestBed.inject(EmployeeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('preserves backend team names that are not part of default enum values', () => {
    let employees = [] as Array<{ team: string }>;

    service.listEmployees().subscribe((result) => {
      employees = result;
    });

    const request = httpMock.expectOne((req) => req.url === '/api/employees');
    expect(request.request.method).toBe('GET');

    request.flush([
      {
        id: 'e-1',
        job_number: 'EMP-100',
        full_name: 'Jamie Brooks',
        job_title: 'People Partner',
        team: 'customer success',
        location: 'north',
        status: 'active'
      }
    ]);

    expect(employees.length).toBe(1);
    expect(employees[0].team).toBe('customer success');
  });

  it('uses unassigned when backend team is missing', () => {
    let employees = [] as Array<{ team: string }>;

    service.listEmployees().subscribe((result) => {
      employees = result;
    });

    const request = httpMock.expectOne((req) => req.url === '/api/employees');
    request.flush([
      {
        id: 'e-2',
        job_number: 'EMP-101',
        full_name: 'Alex Kim',
        job_title: 'Recruiter',
        location: 'south',
        status: 'active'
      }
    ]);

    expect(employees.length).toBe(1);
    expect(employees[0].team).toBe('unassigned');
  });
});
