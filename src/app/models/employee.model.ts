export enum EmployeeTeam {
  Engineering = 'engineering',
  Product = 'product',
  Design = 'design',
  Sales = 'sales',
  Operations = 'operations'
}

export type EmployeeLocation = string;

export const DEFAULT_EMPLOYEE_LOCATION = 'north';

export type EmployeeTeamFilter = 'all' | string;
export type EmployeeLocationFilter = 'all' | EmployeeLocation;
export type EmployeeStatusFilter = 'all' | 'active' | 'pipeline';
export type EmployeeRetentionFilter = 'all' | 'retained' | 'not-retained';

export enum EmployeeSortBy {
  RecentlyAdded = 'recently-added',
  NameAscending = 'name-ascending',
  Team = 'team',
  AppraisalDate = 'appraisal-date'
}

export type PipelineStage = 'training' | 'waiting-to-join';

export interface Employee {
  id: string;
  jobNumber: string;
  fullName: string;
  jobTitle: string;
  team: string;
  location: EmployeeLocation;
  avatarUrl: string;
  status: 'active' | 'away' | 'offline' | 'pipeline';
  isInPipeline?: boolean;
  pipelineStage?: PipelineStage;
  trainingCourse?: string;
  expectedStartDate?: string;
  jobId?: string | null;
  service?: string;
  grade?: string;
  appraisalDueDate?: string;
  fad?: string;
}

export interface CreateEmployeeInput {
  jobNumber: string;
  fullName: string;
  jobTitle: string;
  team: string;
  location: EmployeeLocation;
  avatarUrl?: string;
  status: 'active' | 'away' | 'offline' | 'pipeline';
  service?: string;
  grade?: string;
  appraisalDueDate?: string;
  expectedStartDate?: string;
  fad?: string;
}

export interface UpdateEmployeeInput {
  jobNumber: string;
  fullName: string;
  jobTitle: string;
  team: string;
  location: EmployeeLocation;
  avatarUrl?: string;
  status: 'active' | 'away' | 'offline' | 'pipeline';
  service?: string;
  grade?: string;
  appraisalDueDate?: string;
  expectedStartDate?: string;
  fad?: string;
}

export interface EmployeeTeamMeta {
  label: string;
  badgeClass: string;
}

export const EMPLOYEE_TEAM_META: Record<string, EmployeeTeamMeta> = {
  [EmployeeTeam.Engineering]: {
    label: 'Engineering',
    badgeClass: 'bg-blue-50 text-blue-700'
  },
  [EmployeeTeam.Product]: {
    label: 'Product',
    badgeClass: 'bg-purple-50 text-purple-700'
  },
  [EmployeeTeam.Design]: {
    label: 'Design',
    badgeClass: 'bg-orange-50 text-orange-700'
  },
  [EmployeeTeam.Sales]: {
    label: 'Sales',
    badgeClass: 'bg-emerald-50 text-emerald-700'
  },
  [EmployeeTeam.Operations]: {
    label: 'Operations',
    badgeClass: 'bg-slate-50 text-slate-700'
  }
};

/**
 * Safely retrieves team metadata with fallback styling for unknown teams.
 * Returns the metadata if found, otherwise returns a default style.
 */
export function getTeamMeta(team: string): EmployeeTeamMeta {
  const normalizedTeam = normalizeTeamKey(team);
  const knownTeamMeta = EMPLOYEE_TEAM_META[normalizedTeam];

  return (
    knownTeamMeta ?? {
      label: toDisplayTeamLabel(team),
      badgeClass: 'bg-slate-100 text-slate-700'
    }
  );
}

function normalizeTeamKey(team: string): string {
  return team.trim().toLowerCase();
}

function toDisplayTeamLabel(team: string): string {
  const trimmed = team.trim();

  if (!trimmed) {
    return 'Unassigned';
  }

  return trimmed
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function toDisplayLocationLabel(location: string): string {
  const trimmed = location.trim();

  if (!trimmed) {
    return 'Unknown';
  }

  return trimmed
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
