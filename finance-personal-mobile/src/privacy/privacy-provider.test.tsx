import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import { PrivacyProvider, usePrivacy } from './privacy-provider';

function Probe() {
  return React.createElement('PrivacyProbe', usePrivacy());
}

let tree: ReactTestRenderer | undefined;
const read = vi.mocked(SecureStore.getItemAsync);
const write = vi.mocked(SecureStore.setItemAsync);

async function render() {
  await act(async () => {
    tree = create(
      <PrivacyProvider>
        <Probe />
      </PrivacyProvider>,
    );
  });
  return () => tree!.root.find((node) => (node.type as unknown) === 'PrivacyProbe').props;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
});

describe('saved amount privacy', () => {
  it('hides amounts while the saved preference is still loading', async () => {
    let resolve!: (value: string | null) => void;
    read.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    const probe = await render();
    expect(probe()).toMatchObject({ hidden: true, ready: false });
    await act(async () => resolve('true'));
    expect(probe()).toMatchObject({ hidden: true, ready: true });
  });

  it.each(['false', null])('shows amounts only after loading the visible preference %s', async (saved) => {
    read.mockResolvedValueOnce(saved);
    const probe = await render();
    expect(probe()).toMatchObject({ hidden: false, ready: true });
  });

  it('keeps amounts hidden if the preference cannot be read', async () => {
    read.mockRejectedValueOnce(new Error('Storage unavailable'));
    const probe = await render();
    expect(probe()).toMatchObject({ hidden: true, ready: true });
  });

  it('lets the person explicitly show amounts after loading the hidden preference', async () => {
    read.mockResolvedValueOnce('true');
    const probe = await render();
    await act(async () => probe().toggle());
    expect(probe()).toMatchObject({ hidden: false, ready: true });
    expect(write).toHaveBeenCalledWith('finance-personal.privacy-hidden.v1', 'false');
  });
});
