import { describe, it, expect } from "vitest";
import IntentState from "./intentState";
import type { IntentState as BackendIntentState } from "$lib/generated/cashier_backend/cashier_backend.did";

describe("IntentState.fromBackendType", () => {
  it("maps Created", () => {
    const b = { Created: null } as BackendIntentState;
    const s = IntentState.fromBackendType(b);
    expect(s).toBe(IntentState.Created);
  });
});
