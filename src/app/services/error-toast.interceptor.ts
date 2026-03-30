import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs';
import { ToastService } from './toast.service';

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Global error-notification interceptor.
 * Shows user-facing toasts for backend bad-request responses.
 */
export const errorToastInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const toastService = inject(ToastService);

  return next(request).pipe(
    timeout({ each: REQUEST_TIMEOUT_MS }),
    catchError((error: unknown) => {
      if (error instanceof TimeoutError) {
        toastService.showError('Request timed out. The server took too long to respond.');
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse && error.status === 0) {
        toastService.showError('Unable to reach the server. Please check your connection and try again.');
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse && shouldToastError(error.status)) {
        toastService.showError(toErrorMessage(error));
      }

      return throwError(() => error);
    })
  );
};

function toErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 422) {
    return toValidationErrorMessage(error.error);
  }

  if (error.status >= 500) {
    return toServerErrorMessage(error.error);
  }

  const fallbackMessage = 'Bad request. Please check your input and try again.';

  if (!error.error) {
    return fallbackMessage;
  }

  if (typeof error.error === 'string') {
    return error.error.trim() || fallbackMessage;
  }

  if (typeof error.error === 'object') {
    const detail = getStringField(error.error, ['detail', 'message', 'error']);
    if (detail) {
      return detail;
    }
  }

  return fallbackMessage;
}

function shouldToastError(status: number): boolean {
  return status === 400 || status === 422 || status >= 500;
}

function toValidationErrorMessage(payload: unknown): string {
  const fallbackMessage = 'Validation failed. Please review the form fields and try again.';

  if (!payload || typeof payload !== 'object') {
    return fallbackMessage;
  }

  const detail = (payload as Record<string, unknown>)['detail'];

  if (!Array.isArray(detail) || detail.length === 0) {
    return getStringField(payload as object, ['message', 'error']) ?? fallbackMessage;
  }

  const validationMessages = detail
    .map((entry) => toValidationMessage(entry))
    .filter((entry): entry is string => Boolean(entry));

  if (validationMessages.length === 0) {
    return fallbackMessage;
  }

  return validationMessages.slice(0, 3).join(' | ');
}

function toValidationMessage(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const source = entry as Record<string, unknown>;
  const message = typeof source['msg'] === 'string' ? source['msg'].trim() : '';
  const location = Array.isArray(source['loc'])
    ? source['loc']
        .map((part) => String(part))
        .filter((part) => part.length > 0)
        .join('.')
    : '';

  if (!message) {
    return null;
  }

  if (!location) {
    return message;
  }

  return `${location}: ${message}`;
}

function toServerErrorMessage(payload: unknown): string {
  const fallbackMessage = 'Server error. Please try again in a moment.';

  if (!payload) {
    return fallbackMessage;
  }

  if (typeof payload === 'string') {
    return payload.trim() || fallbackMessage;
  }

  if (typeof payload === 'object') {
    return getStringField(payload as object, ['detail', 'message', 'error']) ?? fallbackMessage;
  }

  return fallbackMessage;
}

function getStringField(source: object, keys: string[]): string | null {
  for (const key of keys) {
    const value = (source as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}
