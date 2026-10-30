import { describe, expect, it } from 'vitest';
import { emptyGuideProgress, guideKey, guideTopics, parseGuideProgress } from './ecosystem-guide';

describe('guide progress is reading progress, isolated from financial setup', () => {
  it('recovers missing, malformed and obsolete local data safely', () => {
    for (const value of [null, 'done', '{', 'null', '"old"'])
      expect(parseGuideProgress(value)).toEqual(emptyGuideProgress());
    expect(
      parseGuideProgress(
        JSON.stringify({ reviewed: ['accounts', 'accounts', 'unknown', 9, 'credits'], lastTopic: 'unknown' }),
      ),
    ).toEqual({ reviewed: ['accounts', 'credits'], lastTopic: 'accounts' });
  });
  it('separates users and never marks a financial account or payment as completed', () => {
    expect(guideKey(1)).not.toBe(guideKey(2));
    expect(guideKey(1)).not.toContain('finance-first-run');
    expect(new Set(guideTopics.map((topic) => topic.id)).size).toBe(guideTopics.length);
    expect(guideTopics.every((topic) => topic.steps.length >= 3)).toBe(true);
  });
});
