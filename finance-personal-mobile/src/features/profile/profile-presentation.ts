export function profileInitials(name?: string): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const first = Array.from(words[0] ?? '')[0] ?? '';
  const last = words.length > 1 ? (Array.from(words[words.length - 1]!)[0] ?? '') : '';
  return (first + last).toLocaleUpperCase('es').slice(0, 4) || '?';
}
