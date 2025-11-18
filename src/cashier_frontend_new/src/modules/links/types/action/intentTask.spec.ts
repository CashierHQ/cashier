import { describe, it, expect } from "vitest";
import IntentTask, { IntentTaskMapper } from "./intentTask";
import type { IntentTask as BackendIntentTask } from "$lib/generated/cashier_backend/cashier_backend.did";

describe("IntentTask.fromBackendType", () => {
  it("maps TransferWalletToLink", () => {
    const b = { TransferWalletToLink: null } as BackendIntentTask;
    const t = IntentTaskMapper.fromBackendType(b);
    expect(t).toBe(IntentTask.TRANSFER_WALLET_TO_LINK);
  });

  it("serializes and deserializes IntentTask via serde", () => {
    const v = IntentTask.TRANSFER_LINK_TO_WALLET;
    const ser = IntentTaskMapper.serde.serialize.IntentTask(v);
    const des = IntentTaskMapper.serde.deserialize.IntentTask(ser);
    expect(des).toBe(v);
  });
});
