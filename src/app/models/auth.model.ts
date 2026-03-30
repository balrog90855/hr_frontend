import { EmployeeTeam } from './employee.model';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  jobTitle?: string;
  team?: EmployeeTeam;
  avatarUrl?: string;
  status?: 'active' | 'away' | 'offline';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}
