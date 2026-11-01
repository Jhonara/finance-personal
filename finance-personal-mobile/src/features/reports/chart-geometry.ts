export type RingDatum = { key: string; value: number };
export type RingSegment = RingDatum & {
  index: number;
  startAngle: number;
  endAngle: number;
  fraction: number;
};

const turn = Math.PI * 2;

/** Angles run clockwise from twelve o'clock. Zero/invalid values have no slice. */
export function ringSegments(parts: readonly RingDatum[]): RingSegment[] {
  const positive = parts.filter((part) => Number.isFinite(part.value) && part.value > 0);
  const largest = Math.max(0, ...positive.map((part) => part.value));
  const scaledTotal = positive.reduce((sum, part) => sum + part.value / largest, 0);
  let angle = 0;
  return parts.flatMap((part, index) => {
    if (!Number.isFinite(part.value) || part.value <= 0 || scaledTotal <= 0) return [];
    const fraction = part.value / largest / scaledTotal;
    const startAngle = angle;
    angle += fraction * turn;
    return [{ ...part, index, startAngle, endAngle: angle, fraction }];
  });
}

/** Filled annular sectors have disjoint hit areas, unlike dashed full circles. */
export function ringSegmentPath(
  startAngle: number,
  endAngle: number,
  cx = 104,
  cy = 104,
  innerRadius = 72,
  outerRadius = 96,
): string {
  const span = endAngle - startAngle;
  if (span <= 0 || !Number.isFinite(span)) return '';
  const point = (radius: number, angle: number) =>
    `${cx + radius * Math.sin(angle)} ${cy - radius * Math.cos(angle)}`;
  const outerStart = point(outerRadius, startAngle);
  const innerStart = point(innerRadius, startAngle);
  // SVG cannot draw a full circle with a single arc whose endpoints coincide.
  if (span >= turn) {
    const outerOpposite = point(outerRadius, startAngle + Math.PI);
    const innerOpposite = point(innerRadius, startAngle + Math.PI);
    return `M ${outerStart} A ${outerRadius} ${outerRadius} 0 1 1 ${outerOpposite} A ${outerRadius} ${outerRadius} 0 1 1 ${outerStart} L ${innerStart} A ${innerRadius} ${innerRadius} 0 1 0 ${innerOpposite} A ${innerRadius} ${innerRadius} 0 1 0 ${innerStart} Z`;
  }
  const large = span > Math.PI ? 1 : 0;
  return `M ${outerStart} A ${outerRadius} ${outerRadius} 0 ${large} 1 ${point(outerRadius, endAngle)} L ${point(innerRadius, endAngle)} A ${innerRadius} ${innerRadius} 0 ${large} 0 ${innerStart} Z`;
}

/** Shared by chart hit-testing and tests; the centre/background never selects a slice. */
export function ringSegmentAtPoint(
  segments: readonly RingSegment[],
  x: number,
  y: number,
  cx = 104,
  cy = 104,
  innerRadius = 72,
  outerRadius = 100,
): RingSegment | undefined {
  const distance = Math.hypot(x - cx, y - cy);
  if (distance < innerRadius || distance > outerRadius) return undefined;
  const angle = (Math.atan2(x - cx, cy - y) + turn) % turn;
  return segments.find((segment) => angle >= segment.startAngle && angle < segment.endAngle);
}

export function reportBarScale(
  items: readonly { value: number; reference?: number }[],
  item: { value: number; reference?: number },
  scale: 'shared' | 'individual',
) {
  const values = (scale === 'individual' ? [item] : items)
    .flatMap((entry) => [entry.value, entry.reference ?? 0])
    .filter(Number.isFinite);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  return { min, max, x: (value: number) => 2 + ((value - min) / (max - min)) * 296 };
}
