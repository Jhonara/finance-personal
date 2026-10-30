import { describe, expect, it } from 'vitest';
import { redirectSystemPath } from '@/app/+native-intent';
import { prepareSharedText } from './shared-text-intake';

describe('Android shared text intake', () => {
  it('routes only the native sharing host to the capture gate', () => {
    expect(redirectSystemPath({ path: 'financepersonalmobile://expo-sharing', initial: true })).toBe(
      '/shared-capture',
    );
    expect(redirectSystemPath({ path: '/android-shortcut?action=expense', initial: true })).toBe(
      '/android-shortcut?action=expense',
    );
  });

  it('prepares a review suggestion without any account, permission or ledger command', () => {
    const result = prepareSharedText('Compraste COP 25.000 en Panadería el 23/10/2026. Saldo COP 100.000');
    expect(result?.intake).toMatchObject({
      source: 'SHARED_TEXT',
      values: { kind: 'EXPENSE', amount: '25000', currency: 'COP', effectiveDate: '2026-10-23' },
    });
    expect(result?.intake.values.accountId).toBeUndefined();
    expect(result?.intake.requestKey).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('Saldo COP 100.000');
  });

  it('retains non-expenses as OTHER for the existing link-first workflow', () => {
    expect(prepareSharedText('Recibiste COP 500.000 por nómina')?.intake.values.kind).toBe('OTHER');
    expect(prepareSharedText('Transferiste COP 50.000')?.intake.values.kind).toBe('OTHER');
    expect(prepareSharedText('Tu código de seguridad 123456 para compra COP 50.000')).toBeNull();
  });
});
