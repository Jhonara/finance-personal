import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: { status: 'authenticated' } as { status: string },
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  clear: vi.fn(),
  ocr: vi.fn(),
  pdf: vi.fn(),
  cachedCopy: true,
  deleteCopy: vi.fn(),
  sharedPayloads: [
    { shareType: 'text', mimeType: 'text/plain', value: 'Compraste COP 25.000 en Mercado' },
  ] as { shareType: string; mimeType: string; value: string }[],
  resolvedSharedPayloads: [] as {
    value: string;
    contentType: string;
    contentUri: string;
    contentSize: number;
  }[],
}));
vi.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ state: mocks.state, logout: mocks.logout }) }));
vi.mock('@/features/profile/profile-api', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/api/errors', () => ({ toApiError: (error: { status?: number }) => error }));
vi.mock('@/privacy/privacy-provider', () => ({ usePrivacy: () => ({ hidden: false }) }));
vi.mock('expo-router', () => ({ router: { replace: vi.fn() } }));
vi.mock('expo-sharing', () => ({
  useIncomingShare: () => ({
    sharedPayloads: mocks.sharedPayloads,
    resolvedSharedPayloads: mocks.resolvedSharedPayloads,
    clearSharedPayloads: mocks.clear,
  }),
}));
vi.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    exists = mocks.cachedCopy;
    size = mocks.cachedCopy ? 1024 : 0;
    constructor(uri: string) {
      this.uri = uri;
    }
    delete() {
      mocks.deleteCopy(this.uri);
    }
  },
  Paths: { cache: { uri: 'file:///cache' } },
}));
vi.mock('@/features/capture/ocr', () => ({
  captureOcr: { available: true, recognizeImage: mocks.ocr, recognizePdf: mocks.pdf },
}));
vi.mock('react-native', () => ({ Text: 'Text' }));
vi.mock('@/ui/primitives', () => ({ Button: 'Button', Card: 'Card', Screen: 'Screen' }));
vi.mock('@/ui/states', () => ({ EmptyState: 'EmptyState', SkeletonRow: 'SkeletonRow' }));
vi.mock('@/ui/headers', () => ({ ScreenHeader: 'ScreenHeader' }));
vi.mock('@/theme', () => ({ spacing: {}, typography: {} }));
vi.mock('@/app/(app)/purchase-review', () => ({ PurchaseEditor: 'PurchaseEditor' }));
vi.mock('@/features/capture/use-detected-drafts', () => ({
  useDetectedDrafts: () => ({
    saved: new Proxy({}, { get: () => ({ id: 91, fields: { amount: 25000 }, status: 'PENDING' }) }),
    errors: {},
    retry: vi.fn(),
  }),
}));
vi.mock('@/app/(auth)/login', () => ({ default: 'LoginScreen' }));

import SharedCaptureScreen from '@/app/shared-capture';

let tree: ReactTestRenderer;
const nodes = (name: string) => tree.root.findAll((node) => node.type === name);
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.state = { status: 'authenticated' };
  mocks.getCurrentUser.mockResolvedValue({ id: 7 });
  mocks.logout.mockResolvedValue(undefined);
  mocks.cachedCopy = true;
  mocks.sharedPayloads = [
    { shareType: 'text', mimeType: 'text/plain', value: 'Compraste COP 25.000 en Mercado' },
  ];
  mocks.resolvedSharedPayloads = [];
  mocks.ocr.mockResolvedValue('Pagaste COP 30.000 en Tienda el 25/10/2026');
  mocks.pdf.mockResolvedValue({
    pageCount: 2,
    pages: [
      { page: 1, text: 'Compraste COP 10.000 en Café el 25/10/2026' },
      { page: 2, text: 'Transferiste COP 20.000 el 25/10/2026' },
    ],
  });
});

describe('shared capture authentication and review gate', () => {
  it('does not expose a shared financial message before authentication', async () => {
    mocks.state = { status: 'unauthenticated' };
    await act(async () => {
      tree = create(<SharedCaptureScreen />);
    });
    expect(nodes('LoginScreen')).toHaveLength(1);
    expect(nodes('PurchaseEditor')).toHaveLength(0);
  });

  it('checks the server session before review and never posts on import', async () => {
    await act(async () => {
      tree = create(<SharedCaptureScreen />);
    });
    expect(mocks.getCurrentUser).toHaveBeenCalledOnce();
    expect(nodes('PurchaseEditor')).toHaveLength(0);
    const button = nodes('Button').find((node) => node.props.children === 'Revisar y corregir')!;
    await act(async () => button.props.onPress());
    const editor = nodes('PurchaseEditor')[0]!;
    expect(editor.props.initial).toMatchObject({ id: 91, status: 'PENDING' });
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it('keeps shared text pending on an offline verification failure', async () => {
    mocks.getCurrentUser.mockRejectedValueOnce({ status: 503 });
    await act(async () => {
      tree = create(<SharedCaptureScreen />);
    });
    expect(nodes('PurchaseEditor')).toHaveLength(0);
    expect(nodes('Button').map((node) => node.props.children)).toContain('Reintentar');
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it('requires login again when the server rejects an expired session', async () => {
    mocks.getCurrentUser.mockRejectedValueOnce({ status: 401 });
    await act(async () => {
      tree = create(<SharedCaptureScreen />);
    });
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(nodes('PurchaseEditor')).toHaveLength(0);
  });

  it('reads a shared image locally and opens only a reviewable draft', async () => {
    mocks.sharedPayloads = [{ shareType: 'image', mimeType: 'image/png', value: 'content://image/42' }];
    mocks.resolvedSharedPayloads = [
      {
        value: 'content://image/42',
        contentType: 'image',
        contentUri: 'content://image/42',
        contentSize: 1024,
      },
    ];
    await act(async () => {
      tree = create(<SharedCaptureScreen />);
    });
    expect(mocks.ocr).toHaveBeenCalledWith('content://image/42');
    expect(nodes('PurchaseEditor')).toHaveLength(0);
    const button = nodes('Button').find((node) => node.props.children === 'Revisar y corregir')!;
    await act(async () => button.props.onPress());
    expect(nodes('PurchaseEditor')[0]?.props.initial).toMatchObject({ id: 91 });
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it('falls back to the original shared URI if Expo could not copy the image', async () => {
    mocks.cachedCopy = false;
    mocks.sharedPayloads = [{ shareType: 'image', mimeType: 'image/png', value: 'content://image/42' }];
    mocks.resolvedSharedPayloads = [
      {
        value: 'content://image/42',
        contentType: 'image',
        contentUri: 'file:///cache/qa.png',
        contentSize: 1024,
      },
    ];
    await act(async () => {
      tree = create(<SharedCaptureScreen />);
    });
    expect(mocks.ocr).toHaveBeenCalledWith('content://image/42');
    expect(nodes('PurchaseEditor')).toHaveLength(0);
  });

  it('deletes only its temporary shared copy when a receipt is discarded', async () => {
    mocks.sharedPayloads = [{ shareType: 'image', mimeType: 'image/png', value: 'content://image/42' }];
    mocks.resolvedSharedPayloads = [
      {
        value: 'content://image/42',
        contentType: 'image',
        contentUri: 'file:/cache/qa.png',
        contentSize: 1024,
      },
    ];
    await act(async () => {
      tree = create(<SharedCaptureScreen />);
    });
    const discard = nodes('Button').find((node) =>
      ['Descartar comprobante', 'Cerrar captura'].includes(node.props.children),
    )!;
    await act(async () => discard.props.onPress());
    expect(mocks.deleteCopy).toHaveBeenCalledWith('file:/cache/qa.png');
    expect(mocks.clear).toHaveBeenCalledOnce();
  });

  it('rejects oversized shared images before OCR', async () => {
    mocks.sharedPayloads = [{ shareType: 'image', mimeType: 'image/png', value: 'content://image/large' }];
    mocks.resolvedSharedPayloads = [
      {
        value: 'content://image/large',
        contentType: 'image',
        contentUri: 'content://image/large',
        contentSize: 11 * 1024 * 1024,
      },
    ];
    await act(async () => {
      tree = create(<SharedCaptureScreen />);
    });
    expect(mocks.ocr).not.toHaveBeenCalled();
    expect(nodes('PurchaseEditor')).toHaveLength(0);
    expect(nodes('EmptyState').some((node) => node.props.description.includes('10 MB'))).toBe(true);
  });

  it('offers each PDF page for explicit review without posting to the ledger', async () => {
    mocks.sharedPayloads = [{ shareType: 'file', mimeType: 'application/pdf', value: 'content://file/9' }];
    mocks.resolvedSharedPayloads = [
      {
        value: 'content://file/9',
        contentType: 'file',
        contentUri: 'content://file/9',
        contentSize: 2048,
      },
    ];
    await act(async () => {
      tree = create(<SharedCaptureScreen />);
    });
    expect(mocks.pdf).toHaveBeenCalledWith('content://file/9');
    expect(nodes('PurchaseEditor')).toHaveLength(0);
    const reviews = nodes('Button').filter((node) => node.props.children === 'Revisar y corregir');
    expect(reviews).toHaveLength(2);
    await act(async () => reviews[1]!.props.onPress());
    expect(nodes('PurchaseEditor')[0]?.props.initial).toMatchObject({ id: 91 });
    expect(mocks.clear).not.toHaveBeenCalled();
  });
});
