import { getTeamMeta } from './employee.model';

describe('getTeamMeta', () => {
  it('returns known team metadata regardless of case', () => {
    const meta = getTeamMeta('Engineering');

    expect(meta.label).toBe('Engineering');
    expect(meta.badgeClass).toContain('text-blue-700');
  });

  it('returns a readable fallback label for unknown backend teams', () => {
    const meta = getTeamMeta('customer_success');

    expect(meta.label).toBe('Customer Success');
    expect(meta.badgeClass).toContain('text-slate-700');
  });
});
