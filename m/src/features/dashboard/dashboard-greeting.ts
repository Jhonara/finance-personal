export function greetingForHour(hour: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError('La hora debe estar entre 0 y 23.');
  }
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour < 5) return 'Buenas noches';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function dashboardGreeting(now = new Date(), userName?: string): string {
  const greeting = greetingForHour(now.getHours());
  const name = userName?.trim();
  return name ? `${greeting}, ${name}` : greeting;
}
