import { describe, it, expect } from 'vitest';
import IntentTask from './intentTask';
import type { IntentTask as BackendIntentTask } from '$lib/generated/cashier_backend/cashier_backend.did';

describe('IntentTask.fromBackendType', () => {
  it('maps TransferWalletToLink', () => {
    const b = { TransferWalletToLink: null } as BackendIntentTask;
    const t = IntentTask.fromBackendType(b);
    expect(t).toBe(IntentTask.TransferWalletToLink);
  });
});
