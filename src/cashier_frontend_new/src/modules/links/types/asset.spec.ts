import { describe, it, expect } from 'vitest';
import { Principal } from '@dfinity/principal';
import Asset from './asset';
import type { Asset as BackendAsset } from '$lib/generated/cashier_backend/cashier_backend.did';

describe('Asset.fromBackendType', () => {
  it('maps IC asset to frontend Asset', () => {
    const p = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');
    const backend: BackendAsset = { IC: { address: p } };
    const asset = Asset.fromBackendType(backend);
    expect(asset.address.toText()).toBe(p.toText());
  });
});
