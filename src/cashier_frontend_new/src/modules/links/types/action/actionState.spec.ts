import { describe, it, expect } from "vitest";
import { ActionState, ActionStateMapper } from "./actionState";
import type { IntentState as BackendIntentState } from "$lib/generated/cashier_backend/cashier_backend.did";

describe("ActionState.fromBackendType", () => {
  it("maps backend Created", () => {
    const b = { Created: null } as BackendIntentState;
    const s = ActionStateMapper.fromBackendType(b);
    expect(s).toBe(ActionState.CREATED);
  });

  it("serializes and deserializes ActionState via serde", () => {
    const v = ActionState.CREATED;
    const ser = ActionStateMapper.serde.serialize.ActionState(v);
    const des = ActionStateMapper.serde.deserialize.ActionState(ser);
    expect(des).toBe(v);
  });
});
