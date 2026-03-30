import { Component, computed, inject } from '@angular/core';
import { EMPLOYEE_TEAM_META, getTeamMeta } from '../../models/employee.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-my-details-page',
  standalone: true,
  templateUrl: './my-details-page.component.html'
})
/**
 * Displays profile details for the currently authenticated user.
 * Data is sourced from the AuthService user state (populated from /api/users
 * at login time). Shows a sign-in prompt if the user is not authenticated.
 */
export class MyDetailsPageComponent {
  private readonly authService = inject(AuthService);

  readonly isSignedIn = this.authService.isSignedIn;
  readonly currentUser = this.authService.currentUser;
  readonly roleLabel = computed(() => {
    const roles = this.currentUser()?.roles ?? [];

    if (roles.length === 0) {
      return 'No assigned roles';
    }

    return roles.join(', ');
  });
  readonly teamLabel = computed(() => {
    const team = this.currentUser()?.team;

    if (!team) {
      return 'Unassigned';
    }

    return getTeamMeta(team).label;
  });
  readonly statusLabel = computed(() => {
    const status = this.currentUser()?.status;

    if (!status) {
      return 'Unknown';
    }

    return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  });
}
