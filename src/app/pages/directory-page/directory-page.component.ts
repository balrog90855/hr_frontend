import { Component } from '@angular/core';
import { DirectoryControlsComponent } from '../../components/directory-controls/directory-controls.component';
import { EmployeeGridComponent } from '../../components/employee-grid/employee-grid.component';
import { PaginationFooterComponent } from '../../components/pagination-footer/pagination-footer.component';

@Component({
  selector: 'app-directory-page',
  standalone: true,
  imports: [DirectoryControlsComponent, EmployeeGridComponent, PaginationFooterComponent],
  templateUrl: './directory-page.component.html'
})
export class DirectoryPageComponent {}
