import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './services/auth.interceptor';
import { errorToastInterceptor } from './services/error-toast.interceptor';

import { routes } from './app.routes';

/**
 * Root application configuration.
 * - Zone change detection uses event coalescing for better performance.
 * - HttpClient is wired with the auth interceptor so every request
 *   automatically carries the Bearer token and handles 401 refresh.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorToastInterceptor, authInterceptor]))
  ]
};
