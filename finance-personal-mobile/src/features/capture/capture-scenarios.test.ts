import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-notifications', () => ({}));
vi.mock('expo-secure-store', () => ({}));
vi.mock('@/auth/auth-provider', () => ({ api: {} }));
vi.mock('@/features/profile/profile-api', () => ({}));
import { captureScenarios } from './capture-scenarios';
import { captureRejectionReason } from './interpret-text';
import { prepareCaptureText } from './shared-text-intake';
import { detectedRequestKey } from './detected-intake';

describe('fictional bank capture scenarios', () => {
  it('classifies each example without making a server request', () => {
    for (const scenario of captureScenarios) {
      const intake = prepareCaptureText(scenario.text, 'SHARED_TEXT');
      expect(intake?.suggestion.kind ?? 'IGNORED', scenario.title).toBe(scenario.expected);
    }
    expect(captureRejectionReason(captureScenarios[6]!.text)).toBe('NO_MOVEMENT');
    expect(captureRejectionReason(captureScenarios[7]!.text)).toBe('AUTH_MESSAGE');
  });

  it('keeps an exact replay on one key and separates two equal purchases at different hours', () => {
    const first = captureScenarios[0]!;
    const later = captureScenarios[1]!;
    const replay = captureScenarios[2]!;
    const key = (scenario: typeof first) =>
      detectedRequestKey(prepareCaptureText(scenario.text, 'SHARED_TEXT')!, `qa-${scenario.eventId}`);
    expect(key(first)).toBe(key(replay));
    expect(key(first)).not.toBe(key(later));
  });

  it('does not guess missing financial fields or turn transfers into expenses', () => {
    const incomplete = prepareCaptureText(captureScenarios[4]!.text, 'SHARED_TEXT')!;
    expect(incomplete.suggestion.amount).toBeUndefined();
    expect(incomplete.suggestion.warnings).toContain('Falta el importe.');
    expect(prepareCaptureText(captureScenarios[5]!.text, 'SHARED_TEXT')?.intake.values.kind).toBe('OTHER');
    expect(prepareCaptureText(captureScenarios[3]!.text, 'SHARED_TEXT')?.suggestion.currency).toBe('USD');
  });
});
