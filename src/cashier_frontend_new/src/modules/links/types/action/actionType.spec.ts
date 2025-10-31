import { describe, it, expect } from "vitest";
import { ActionType, ActionTypeMapper } from "./actionType";
import type { ActionType as BackendActionType } from "$lib/generated/cashier_backend/cashier_backend.did";

describe("ActionType conversions", () => {
  it("maps backend Use to frontend", () => {
    const b = { Use: null } as BackendActionType;
    const t = ActionTypeMapper.fromBackendType(b);
    expect(t).toBe(ActionType.USE);
  });
});
