import { describe, expect, it } from 'vitest';

import { dashboardGreeting, greetingForHour } from './dashboard-greeting';

describe('dashboard greeting', () => {
  it('uses the morning greeting from 05:00 through 11:59', () => {
    expect(greetingForHour(5)).toBe('Buenos días');
    expect(greetingForHour(11)).toBe('Buenos días');
  });

  it('uses the afternoon greeting from 12:00 through 18:59', () => {
    expect(greetingForHour(12)).toBe('Buenas tardes');
    expect(greetingForHour(18)).toBe('Buenas tardes');
  });

  it('uses the night greeting from 19:00 through 04:59', () => {
    expect(greetingForHour(19)).toBe('Buenas noches');
    expect(greetingForHour(4)).toBe('Buenas noches');
  });

  it('personalizes morning, afternoon, and night greetings when the profile provides a name', () => {
    expect(dashboardGreeting(new Date(2026, 8, 3, 9), ' Jhonatan ')).toBe('Buenos días, Jhonatan');
    expect(dashboardGreeting(new Date(2026, 8, 3, 15), 'Jhonatan')).toBe('Buenas tardes, Jhonatan');
    expect(dashboardGreeting(new Date(2026, 8, 3, 21), 'Jhonatan')).toBe('Buenas noches, Jhonatan');
  });

  it('keeps the anonymous greeting when the profile is absent or blank', () => {
    expect(dashboardGreeting(new Date(2026, 8, 3, 9))).toBe('Buenos días');
    expect(dashboardGreeting(new Date(2026, 8, 3, 9), '   ')).toBe('Buenos días');
  });
});
