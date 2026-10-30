import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { inboxKeys, type Draft } from '@/features/inbox/inbox-api';
import { createDetectedDraft, detectedRequestKey } from './detected-intake';
import type { AcceptedSharedText } from './shared-text-intake';

export type DetectedCandidate = { intake: AcceptedSharedText; occurrence?: string };
type Result = { scope: object; saved: Record<string, Draft>; errors: Record<string, string> };

export function useDetectedDrafts(candidates: DetectedCandidate[], scope: object) {
  const client = useQueryClient();
  const started = useRef(new Set<string>());
  const [result, setResult] = useState<Result>(() => ({ scope, saved: {}, errors: {} }));
  useEffect(() => {
    started.current.clear();
    setResult({ scope, saved: {}, errors: {} });
  }, [scope]);
  const capture = useCallback(
    async (candidate: DetectedCandidate, retry = false) => {
      const key = detectedRequestKey(candidate.intake, candidate.occurrence);
      if (started.current.has(key) && !retry) return;
      started.current.add(key);
      setResult((previous) =>
        previous.scope === scope ? { ...previous, errors: { ...previous.errors, [key]: '' } } : previous,
      );
      try {
        const draft = await createDetectedDraft(candidate.intake, candidate.occurrence);
        setResult((previous) =>
          previous.scope === scope ? { ...previous, saved: { ...previous.saved, [key]: draft } } : previous,
        );
        void client.invalidateQueries({ queryKey: inboxKeys.all });
      } catch {
        started.current.delete(key);
        setResult((previous) =>
          previous.scope === scope
            ? {
                ...previous,
                errors: {
                  ...previous.errors,
                  [key]: 'No pudimos guardar el pendiente. Inténtalo de nuevo; el comprobante sigue aquí.',
                },
              }
            : previous,
        );
      }
    },
    [client, scope],
  );
  const keys = candidates.map(({ intake, occurrence }) => detectedRequestKey(intake, occurrence)).join('|');
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    for (const candidate of candidates) void capture(candidate);
    // The stable keys represent the source event, not a render of the candidate array.
  }, [keys, capture]);
  return {
    saved: result.scope === scope ? result.saved : {},
    errors: result.scope === scope ? result.errors : {},
    retry: (candidate: DetectedCandidate) => capture(candidate, true),
  };
}
