import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Auth endpoint suffixes that should NOT trigger a token-refresh retry on 401.
 * These are the endpoints that produce or invalidate tokens themselves.
 */
const AUTH_ENDPOINT_SEGMENTS = ['/login', '/refresh', '/logout'];

/** Returns true if the request targets an auth endpoint (login/refresh/logout). */
function isAuthEndpoint(request: HttpRequest<unknown>): boolean {
  const normalizedUrl = request.url.toLowerCase();
  return AUTH_ENDPOINT_SEGMENTS.some((segment) => normalizedUrl.endsWith(segment));
}

/**
 * HTTP interceptor that:
 * 1. Attaches the Bearer access token to every outgoing request (when signed in).
 * 2. On a 401 response from a non-auth endpoint, attempts a silent token refresh
 *    and automatically retries the original request with the new token.
 * 3. If the refresh also fails, propagates the error so the caller can handle it.
 */
export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessTokenValue();
  const tokenType = authService.getTokenTypeValue();

  // No token — pass the request through unauthenticated (e.g. public endpoints).
  if (!accessToken) {
    return next(request);
  }

  const authorizedRequest = request.clone({
    setHeaders: {
      Authorization: `${tokenType} ${accessToken}`
    }
  });

  // Auth endpoints always get the token but bypass the refresh-retry logic.
  if (isAuthEndpoint(request)) {
    return next(authorizedRequest);
  }

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      // Only attempt refresh on 401; all other errors propagate immediately.
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return authService.refreshSession().pipe(
        switchMap((refreshedAccessToken) => {
          if (!refreshedAccessToken) {
            return throwError(() => error);
          }

          // Retry the original request with the new access token.
          const retryRequest = request.clone({
            setHeaders: {
              Authorization: `${authService.getTokenTypeValue()} ${refreshedAccessToken}`
            }
          });

          return next(retryRequest);
        }),
        catchError((refreshError) => throwError(() => refreshError))
      );
    })
  );
};
