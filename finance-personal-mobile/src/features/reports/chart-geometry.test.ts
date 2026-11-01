import { describe, expect, it } from 'vitest';
import { reportBarScale, ringSegmentAtPoint, ringSegmentPath, ringSegments } from './chart-geometry';

describe('report chart geometry', () => {
  it('finds every category from its actual angle while keeping original identities and indexes', () => {
    const segments = ringSegments([
      { key: 'empty', value: 0 },
      { key: 'mercado', value: 200000 },
      { key: 'educacion', value: 120000 },
      { key: 'alimentacion', value: 78000 },
      { key: 'comida', value: 10000 },
    ]);
    for (const segment of segments) {
      const angle = (segment.startAngle + segment.endAngle) / 2;
      expect(ringSegmentAtPoint(segments, 104 + 84 * Math.sin(angle), 104 - 84 * Math.cos(angle))).toEqual(
        segment,
      );
    }
    expect(segments.map(({ key, index }) => [key, index])).toEqual([
      ['mercado', 1],
      ['educacion', 2],
      ['alimentacion', 3],
      ['comida', 4],
    ]);
    expect(ringSegmentAtPoint(segments, 104, 104)).toBeUndefined();
    expect(ringSegmentAtPoint(segments, 400, 400)).toBeUndefined();
  });

  it('keeps small positive slices instead of removing them with a fixed gap', () => {
    const segments = ringSegments([
      { key: 'large', value: 1000000 },
      { key: 'small', value: 1 },
    ]);
    const small = segments[1]!;
    expect(small.endAngle - small.startAngle).toBeGreaterThan(0);
    expect(segments.reduce((sum, segment) => sum + segment.fraction, 0)).toBeCloseTo(1, 14);
    expect(ringSegmentPath(small.startAngle, small.endAngle)).not.toMatch(/NaN|Infinity/);
    const angle = (small.startAngle + small.endAngle) / 2;
    expect(ringSegmentAtPoint(segments, 104 + 84 * Math.sin(angle), 104 - 84 * Math.cos(angle))?.key).toBe(
      'small',
    );
  });

  it('draws a full annulus using two arcs per boundary and ignores nonpositive or invalid values', () => {
    const segments = ringSegments([
      { key: 'refund', value: -1 },
      { key: 'invalid', value: Number.NaN },
      { key: 'infinite', value: Number.POSITIVE_INFINITY },
      { key: 'only', value: 75 },
    ]);
    expect(segments).toHaveLength(1);
    expect(ringSegmentPath(segments[0]!.startAngle, segments[0]!.endAngle).match(/ A /g)).toHaveLength(4);
    expect(ringSegments([])).toEqual([]);
    expect(ringSegmentPath(0, 0)).toBe('');
  });

  it('uses each category limit as its own comparison scale and retains a shared scale for rankings', () => {
    const course = { value: 120000, reference: 200000 };
    const university = { value: 0, reference: 2000000 };
    const items = [course, university];
    const independent = reportBarScale(items, course, 'individual');
    expect(independent.x(course.value) - independent.x(0)).toBeCloseTo(296 * 0.6);
    expect(independent.x(course.reference)).toBe(298);
    expect(reportBarScale(items, university, 'individual').x(university.reference)).toBe(298);
    expect(reportBarScale(items, course, 'shared').x(course.reference)).toBeCloseTo(31.6);
  });

  it('keeps refunds signed and zero limits finite', () => {
    const refund = { value: -20, reference: 100 };
    const signed = reportBarScale([refund], refund, 'individual');
    expect(signed.x(-20)).toBeLessThan(signed.x(0));
    const zero = reportBarScale([{ value: 0, reference: 0 }], { value: 0, reference: 0 }, 'individual');
    expect(Number.isFinite(zero.x(0))).toBe(true);
  });
});
