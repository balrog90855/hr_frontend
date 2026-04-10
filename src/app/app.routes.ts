import { Routes } from '@angular/router';
import { DirectoryPageComponent } from './pages/directory-page/directory-page.component';
import { NominationsPageComponent } from './pages/nominations-page/nominations-page.component';
import { PipelinePageComponent } from './pages/pipeline-page/pipeline-page.component';
// import { MyDetailsPageComponent } from './pages/my-details-page/my-details-page.component';

/**
 * Application routes.
 * The default and wildcard paths both redirect to the directory,
 * so navigating to an unknown URL always lands somewhere sensible.
 */
export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'directory' },
	{ path: 'directory', component: DirectoryPageComponent },
	{ path: 'pipeline', component: PipelinePageComponent },
	{ path: 'nominations', component: NominationsPageComponent },
	// { path: 'my-details', component: MyDetailsPageComponent },
	{ path: '**', redirectTo: 'directory' }
];
