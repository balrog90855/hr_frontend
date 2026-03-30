import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { GlobalSearchService } from '../../services/global-search.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-top-header',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './top-header.component.html'
})
/**
 * Fixed top bar containing:
 * - Global search input (feeds GlobalSearchService)
 * - User avatar / account modal trigger (login, logout, profile display)
 * - Signed-out toast notification
 */
export class TopHeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly globalSearchService = inject(GlobalSearchService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  isAccountModalOpen = false;
  /** Prevents double-submits during login/logout network requests. */
  isBusy = signal(false);
  authErrorMessage = signal<string | null>(null);

  readonly loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly demoCredentials = this.authService.demoCredentials;
  readonly searchTerm = this.globalSearchService.searchTerm;
  readonly isSignedIn = this.authService.isSignedIn;
  /** Display name shown in the header; falls back to 'Guest User' when signed out. */
  readonly displayName = computed(
    () => this.authService.currentUser()?.fullName ?? 'Guest User'
  );
  readonly profileAvatarUrl = computed(
    () =>
      this.authService.currentUser()?.avatarUrl ??
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD-Z79wkIUNCRWT_VO7d2Oms_dqMgVJF4wJm79y4p01GqumMxuVmg5g4YcgS0Sj9avyUXHggtw5GfQ6HpHceZE-LmjJlj-tlnsXo767N-RXJBt8JJq76IytDRWgLiIsWz9ytU5l4yR4BjuRHKUjhsJGMGw1p1eppTBT2expoZUBvNbtyQRhWLFn1MUhsXGFWmNIEBribBsWh2AxdBtAQpSDSKLIVBOR5_MbP3kKU9m560V94YI2FDY4Yt9GYDdevkGrHQ8mTsHEMy8'
  );
  readonly accessLabel = computed(() => {
    if (!this.isSignedIn()) {
      return 'Guest';
    }

    const roles = this.authService.currentUser()?.roles ?? [];
    return roles.includes('admin') ? 'Admin Access' : 'User Access';
  });

  openAccountModal(): void {
    this.authErrorMessage.set(null);
    this.isAccountModalOpen = true;
  }

  closeAccountModal(): void {
    this.isAccountModalOpen = false;
  }

  login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.authErrorMessage.set('Please provide a valid email and password.');
      return;
    }

    const email = this.loginForm.controls.email.value?.trim() ?? '';
    const password = this.loginForm.controls.password.value ?? '';

    this.authErrorMessage.set(null);
    this.isBusy.set(true);

    this.authService
      .login({ email, password })
      .pipe(finalize(() => this.isBusy.set(false)))
      .subscribe({
        next: () => {
          this.loginForm.reset();
          this.closeAccountModal();
        },
        error: () => this.authErrorMessage.set('Unable to sign in. Please verify your credentials.')
      });
  }

  logOff(): void {
    this.authErrorMessage.set(null);
    this.isBusy.set(true);

    this.authService
      .logout()
      .pipe(finalize(() => this.isBusy.set(false)))
      .subscribe({
        next: () => {
          this.closeAccountModal();
          this.toastService.showSuccess('Signed out.');
        },
        error: () => this.authErrorMessage.set('Unable to log off right now. Please try again.')
      });
  }

  useDemoCredential(email: string, password: string): void {
    this.loginForm.patchValue({ email, password });
    this.loginForm.markAsDirty();
    this.login();
  }

  updateSearchTerm(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.globalSearchService.setSearchTerm(input?.value ?? '');
  }
}
