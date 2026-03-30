import { Injectable, signal } from '@angular/core';

export interface AppToast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsState = signal<AppToast[]>([]);
  private readonly toastTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly toasts = this.toastsState.asReadonly();

  showSuccess(message: string, durationMs = 3000): void {
    this.show(message, 'success', durationMs);
  }

  showError(message: string, durationMs = 5000): void {
    this.show(message, 'error', durationMs);
  }

  private show(message: string, variant: AppToast['variant'], durationMs: number): void {
    const id = this.nextId++;
    const toast: AppToast = {
      id,
      message,
      variant
    };

    this.toastsState.update((current) => [...current, toast].slice(-3));

    const timer = setTimeout(() => {
      this.dismiss(id);
    }, durationMs);

    this.toastTimers.set(id, timer);
  }

  dismiss(id: number): void {
    this.toastsState.update((current) => current.filter((toast) => toast.id !== id));

    const timer = this.toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.toastTimers.delete(id);
    }
  }
}
