import { describe, it, expect } from "vitest";
import IntentState, { IntentStateMapper } from "./intentState";
import type { IntentState as BackendIntentState } from "$lib/generated/cashier_backend/cashier_backend.did";

describe("IntentState.fromBackendType", () => {
  it("maps Created", () => {
    const b = { Created: null } as BackendIntentState;
    const s = IntentStateMapper.fromBackendType(b);
    expect(s).toBe(IntentState.CREATED);
  });

  it("serializes and deserializes IntentState via serde", () => {
    const v = IntentState.CREATED;
    const ser = IntentStateMapper.serde.serialize.IntentState(v as any);
    const des = IntentStateMapper.serde.deserialize.IntentState(ser);
    expect(des).toBe(v);
  });
});
