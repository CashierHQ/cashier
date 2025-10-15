import { describe, it, expect } from 'vitest';
import { Principal } from '@dfinity/principal';
import Action from './action';
import type {
  ActionDto,
  IntentDto,
  Icrc112Request as BackendIcrc112Request,
} from '$lib/generated/cashier_backend/cashier_backend.did';

describe('Action.fromBackendType', () => {
  it('maps backend ActionDto to frontend Action including icrc requests and intents', () => {
    const principal = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');

    const backendIcrc: BackendIcrc112Request = {
      arg: [1, 2, 3],
      method: 'transfer',
      canister_id: principal,
      nonce: [new Uint8Array([9, 9])],
    };

    const intentDto: IntentDto = {
      id: 'intent-1',
      chain: { IC: null },
      task: { TransferWalletToLink: null },
      type: {
        Transfer: {
          to: { IC: { address: principal, subaccount: [] } },
          asset: { IC: { address: principal } },
          from: { IC: { address: principal, subaccount: [] } },
          amount: 1n,
        },
      },
      created_at: 123n,
      state: { Created: null },
      transactions: [],
    };

    const backend: ActionDto = {
      id: 'a1',
      icrc_112_requests: [[ [backendIcrc] ]],
      creator: principal,
      intents: [intentDto],
      type: { Use: null },
      state: { Created: null },
    };

    const action = Action.fromBackendType(backend);

    expect(action.id).toBe('a1');
    expect(action.creator?.toText()).toBe(principal.toText());
    expect(action.intents).toHaveLength(1);
    expect(action.icrc_112_requests).toBeDefined();
    // verify nested icrc conversion: ensure outer arrays exist and contain the method name
    const outer = action.icrc_112_requests ?? [];
    expect(outer.length).toBeGreaterThan(0);
    const asString = JSON.stringify(outer);
    expect(asString).toContain('transfer');
  });
});
