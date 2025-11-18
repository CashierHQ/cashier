import { describe, it, expect } from "vitest";
import { Principal } from "@dfinity/principal";
import type { IntentDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import Intent, { IntentMapper } from "./intent";

describe("Intent.fromBackendType", () => {
  it("maps basic intent dto", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const dto = {
      id: "i1",
      chain: { IC: null },
      task: { TransferWalletToLink: null },
      type: {
        Transfer: {
          to: { IC: { address: p, subaccount: [] } },
          asset: { IC: { address: p } },
          from: { IC: { address: p, subaccount: [] } },
          amount: 1n,
        },
      },
      created_at: 1n,
      state: { Created: null },
      transactions: [],
    } as IntentDto;

    const intent = IntentMapper.fromBackendType(dto);
    expect(intent.id).toBe("i1");
  });

  it("serializes and deserializes Intent via serde", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const dto = {
      id: "i1",
      chain: { IC: null },
      task: { TransferWalletToLink: null },
      type: {
        Transfer: {
          to: { IC: { address: p, subaccount: [] } },
          asset: { IC: { address: p } },
          from: { IC: { address: p, subaccount: [] } },
          amount: 1n,
        },
      },
      created_at: 1n,
      state: { Created: null },
      transactions: [],
    } as IntentDto;

    const intent = IntentMapper.fromBackendType(dto);
    const ser = IntentMapper.serde.serialize.Intent(intent);
    const des = IntentMapper.serde.deserialize.Intent(ser) as Intent;
    expect(des.id).toBe("i1");
    expect(des.created_at).toBe(1n);
    expect(des.type).toBeDefined();
  });
});
