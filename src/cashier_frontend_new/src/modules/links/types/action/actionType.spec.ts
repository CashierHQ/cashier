import { describe, it, expect } from "vitest";
import { ActionType, ActionTypeMapper } from "./actionType";

describe("ActionType conversions", () => {
  it("serializes and deserializes ActionType via serde", () => {
    const v = ActionType.CREATE_LINK;
    const ser = ActionTypeMapper.serde.serialize.ActionType(v);
    const des = ActionTypeMapper.serde.deserialize.ActionType(ser);
    expect(des).toBe(v);
  });
});
