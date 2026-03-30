import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EmployeeTeam } from '../models/employee.model';
import {
  AuthResponse,
  AuthTokens,
  AuthUser,
  LoginRequest,
  RefreshRequest
} from '../models/auth.model';

/** Raw shape returned by POST /api/auth/login and POST /api/auth/refresh. */
interface BackendAuthResponse {
  access_token: string;
  access_token_expires_in?: number;
  refresh_token?: string;
  token_type?: string;
}

/**
 * Raw shape returned by GET /api/users.
 * The users table stores some columns in camelCase (fullName, jobTitle, avatarUrl)
 * while Pydantic-normalised endpoints may return snake_case variants — both are
 * handled in toAuthUser().
 */
interface BackendUser {
  id?: string | number;
  user_id?: string | number;
  email: string;
  full_name?: string;
  name?: string;
  team?: string;
  job_title?: string;
  avatar_url?: string;
  status?: string;
  roles?: string[];
  role?: string;
  is_admin?: boolean;
}

/** Accepts both a plain array and pagination-wrapped envelope responses. */
type BackendUsersResponse =
  | BackendUser[]
  | {
      items?: BackendUser[];
      results?: BackendUser[];
      data?: BackendUser[];
    };

/** Payload sent to POST /api/auth/logout. */
interface LogoutRequest {
  refresh_token?: string;
}

/**
 * Manages authentication state for the application.
 *
 * Responsibilities:
 * - Performs login via POST /api/auth/login and resolves the full user profile
 *   from GET /api/users immediately after, using the freshly issued token.
 * - Persists access token, refresh token, and user profile in localStorage so
 *   sessions survive page reloads.
 * - Exposes reactive signals (isSignedIn, isAdmin, currentUser) consumed by
 *   the rest of the app to gate features and display user info.
 * - Handles token refresh transparently; the auth interceptor calls
 *   refreshSession() when a 401 is received.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Base URL for auth endpoints (e.g. /api/auth). Configurable at runtime. */
  private readonly apiBaseUrlState = signal(environment.authApiBaseUrl);
  /** Base URL for the users resource (e.g. /api/users). */
  private readonly usersApiUrl = `${environment.apiBaseUrl}/users`;

  // localStorage key prefix keeps all auth keys namespaced together.
  private readonly storagePrefix = 'talent-network.auth';
  private readonly accessTokenStorageKey = `${this.storagePrefix}.accessToken`;
  private readonly refreshTokenStorageKey = `${this.storagePrefix}.refreshToken`;
  private readonly tokenTypeStorageKey = `${this.storagePrefix}.tokenType`;
  private readonly userStorageKey = `${this.storagePrefix}.user`;

  // Signals are initialised from localStorage so the session is restored on reload.
  private readonly accessTokenState = signal<string | null>(
    this.readFromStorage<string>(this.accessTokenStorageKey)
  );
  private readonly refreshTokenState = signal<string | null>(
    this.readFromStorage<string>(this.refreshTokenStorageKey)
  );
  private readonly tokenTypeState = signal<string>(
    this.readFromStorage<string>(this.tokenTypeStorageKey) ?? 'Bearer'
  );
  private readonly userState = signal<AuthUser | null>(
    this.readFromStorage<AuthUser>(this.userStorageKey)
  );

  /** Public read-only access token signal — consumed by the auth interceptor. */
  readonly accessToken = this.accessTokenState.asReadonly();
  /** Currently authenticated user profile. Null when signed out. */
  readonly currentUser = this.userState.asReadonly();
  /** True when both an access token and a user profile are present. */
  readonly isSignedIn = computed(() => Boolean(this.accessTokenState() && this.userState()));
  /** True when the current user has the 'admin' role. Controls write access in the UI. */
  readonly isAdmin = computed(() =>
    Boolean(this.userState()?.roles.some((role) => role.toLowerCase() === 'admin'))
  );
  /** Reserved for optional demo credential shortcuts; empty in production. */
  readonly demoCredentials: ReadonlyArray<{ label: string; email: string; password: string }> = [];

  constructor(private readonly http: HttpClient) {}

  /** Returns the raw access token string; used by the auth interceptor. */
  getAccessTokenValue(): string | null {
    return this.accessTokenState();
  }

  /** Returns the Authorization scheme to use in headers (e.g. Bearer, Token). */
  getTokenTypeValue(): string {
    return this.tokenTypeState();
  }

  /** Overrides the auth API base URL at runtime (useful for environment switching). */
  setApiBaseUrl(baseUrl: string): void {
    this.apiBaseUrlState.set(baseUrl.replace(/\/$/, ''));
  }

  login(payload: LoginRequest): Observable<AuthUser> {
    return this.http
      .post<BackendAuthResponse>(`${this.apiBaseUrlState()}/login`, {
        username: payload.email,
        password: payload.password
      })
      .pipe(
        switchMap((response) => {
          // Persist the access token immediately so the interceptor can attach it
          // to the follow-up GET /api/users request made inside fetchUserByEmail.
          const tokens = this.toAuthTokens(response);
          this.persistTokens(tokens);

          return this.fetchUserByEmail(payload.email).pipe(
            map((user) => ({ user, tokens }))
          );
        }),
        tap((response) => this.persistSession(response)),
        map((response) => response.user)
      );
  }

  /**
   * Re-fetches the current user's profile from the backend and updates the
   * stored user state. Useful after profile edits.
   */
  fetchProfile(): Observable<AuthUser> {
    const email = this.userState()?.email;

    if (!email) {
      return of(this.fallbackUser('unknown@local'));
    }

    return this.fetchUserByEmail(email).pipe(
      tap((user) => {
        this.userState.set(user);
        this.saveToStorage(this.userStorageKey, user);
      })
    );
  }

  /**
   * Uses the stored refresh token to obtain a new access token.
   * Called automatically by the auth interceptor on 401 responses.
   * Returns null and clears the session if the refresh token is missing or rejected.
   */
  refreshSession(): Observable<string | null> {
    const refreshToken = this.refreshTokenState();

    if (!refreshToken) {
      return of(null);
    }

    const payload: RefreshRequest = { refreshToken };

    return this.http
      .post<BackendAuthResponse>(`${this.apiBaseUrlState()}/refresh`, {
        refresh_token: payload.refreshToken
      })
      .pipe(
      map((response) => this.toAuthTokens(response)),
      tap((tokens) => this.persistTokens(tokens)),
      map((tokens) => tokens.accessToken),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  /**
   * Clears the local session immediately (so the UI reacts at once) then notifies
   * the backend to invalidate the refresh token. Network errors are silently ignored.
   */
  logout(): Observable<void> {
    const payload: LogoutRequest = { refresh_token: this.refreshTokenState() ?? undefined };
    this.clearSession();

    return this.http.post<void>(`${this.apiBaseUrlState()}/logout`, payload).pipe(
      catchError(() => of(void 0))
    );
  }

  /** Wipes all auth state from memory and localStorage. */
  clearSession(): void {
    this.accessTokenState.set(null);
    this.refreshTokenState.set(null);
    this.tokenTypeState.set('Bearer');
    this.userState.set(null);

    this.removeFromStorage(this.accessTokenStorageKey);
    this.removeFromStorage(this.refreshTokenStorageKey);
    this.removeFromStorage(this.tokenTypeStorageKey);
    this.removeFromStorage(this.userStorageKey);
  }

  private persistSession(response: AuthResponse): void {
    this.userState.set(response.user);
    this.saveToStorage(this.userStorageKey, response.user);
    this.persistTokens(response.tokens);
  }

  private persistTokens(tokens: AuthTokens): void {
    this.accessTokenState.set(tokens.accessToken);
    this.saveToStorage(this.accessTokenStorageKey, tokens.accessToken);
    this.tokenTypeState.set(tokens.tokenType || 'Bearer');
    this.saveToStorage(this.tokenTypeStorageKey, tokens.tokenType || 'Bearer');

    if (tokens.refreshToken) {
      this.refreshTokenState.set(tokens.refreshToken);
      this.saveToStorage(this.refreshTokenStorageKey, tokens.refreshToken);
      return;
    }

    this.refreshTokenState.set(null);
    this.removeFromStorage(this.refreshTokenStorageKey);
  }

  /**
   * Looks up a user record by email from GET /api/users.
   * Falls back to a minimal AuthUser derived from the email address if the
   * request fails or returns no results, so the login flow never breaks.
   */
  private fetchUserByEmail(email: string): Observable<AuthUser> {
    const params = new HttpParams().set('email', email).set('limit', '1').set('offset', '0');

    return this.http.get<BackendUsersResponse>(this.usersApiUrl, { params }).pipe(
      map((response) => {
        const users = Array.isArray(response)
          ? response
          : response.items ?? response.results ?? response.data ?? [];

        const firstUser = users[0];
        if (!firstUser) {
          return this.fallbackUser(email);
        }

        return this.toAuthUser(firstUser);
      }),
      catchError(() => of(this.fallbackUser(email)))
    );
  }

  /** Maps the raw backend auth response to the app's AuthTokens shape. */
  private toAuthTokens(response: BackendAuthResponse): AuthTokens {
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      tokenType: response.token_type ?? 'Bearer',
      expiresIn: response.access_token_expires_in
    };
  }

  /** Normalises a raw backend user object into the app's AuthUser interface. */
  private toAuthUser(user: BackendUser): AuthUser {
    const userId = String(user.id ?? user.user_id ?? user.email);
    const roles = this.extractRoles(user);

    return {
      id: userId,
      email: user.email,
      fullName: user.full_name ?? user.name ?? user.email,
      roles,
      jobTitle: user.job_title,
      team: this.toEmployeeTeam(user.team),
      avatarUrl: user.avatar_url,
      status: this.toStatus(user.status)
    };
  }

  /** Returns a minimal AuthUser from just an email when the users API is unreachable. */
  private fallbackUser(email: string): AuthUser {
    return {
      id: email,
      email,
      fullName: email,
      roles: ['user']
    };
  }

  /**
   * Resolves a roles array from several possible backend shapes:
   * a `roles` array, a single `role` string, or an `is_admin` flag.
   */
  private extractRoles(user: BackendUser): string[] {
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      return user.roles;
    }

    if (typeof user.role === 'string' && user.role.length > 0) {
      return [user.role];
    }

    if (user.is_admin) {
      return ['admin'];
    }

    return ['user'];
  }

  /** Coerces a raw string to an EmployeeTeam enum value; returns undefined for empty input. */
  private toEmployeeTeam(value: string | undefined): EmployeeTeam | undefined {
    const normalized = value?.trim().toLowerCase();

    if (!normalized) {
      return undefined;
    }

    if (normalized === EmployeeTeam.Product) return EmployeeTeam.Product;
    if (normalized === EmployeeTeam.Design) return EmployeeTeam.Design;
    if (normalized === EmployeeTeam.Sales) return EmployeeTeam.Sales;
    if (normalized === EmployeeTeam.Operations) return EmployeeTeam.Operations;
    return EmployeeTeam.Engineering;
  }

  private toStatus(value: string | undefined): AuthUser['status'] {
    const normalized = value?.trim().toLowerCase();
    if (normalized === 'away') return 'away';
    if (normalized === 'offline') return 'offline';
    if (normalized === 'active') return 'active';
    return undefined;
  }

  private readFromStorage<T>(key: string): T | null {
    try {
      const rawValue = localStorage.getItem(key);

      if (!rawValue) {
        return null;
      }

      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  private saveToStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }

  private removeFromStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      return;
    }
  }
}
