import { describe, it, expect } from "vitest";
import { Principal } from "@dfinity/principal";
import { TransferData, TransferFromData } from "./action/intentType";
import type {
  TransferData as BackendTransferData,
  TransferFromData as BackendTransferFromData,
} from "$lib/generated/cashier_backend/cashier_backend.did";

describe("IntentType payloads", () => {
  it("constructs TransferData correctly", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const to: BackendTransferData["to"] = {
      IC: { address: p, subaccount: [] },
    };
    const from: BackendTransferData["from"] = {
      IC: { address: p, subaccount: [] },
    };
    const asset: BackendTransferData["asset"] = { IC: { address: p } };

    const td = TransferData.fromBackendType({ to, asset, from, amount: 10n });
    expect(td.amount).toBe(10n);
    expect(td.to.address.toText()).toBe(p.toText());
  });

  it("constructs TransferFromData correctly", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const to: BackendTransferFromData["to"] = {
      IC: { address: p, subaccount: [] },
    };
    const from: BackendTransferFromData["from"] = {
      IC: { address: p, subaccount: [] },
    };
    const asset: BackendTransferFromData["asset"] = { IC: { address: p } };
    const spender: BackendTransferFromData["spender"] = {
      IC: { address: p, subaccount: [] },
    };

    const tfd = TransferFromData.fromBackendType({
      to,
      asset,
      from,
      actual_amount: [5n],
      amount: 10n,
      approve_amount: [2n],
      spender,
    });

    expect(tfd.amount).toBe(10n);
    expect(tfd.actual_amount).toBe(5n);
    expect(tfd.approve_amount).toBe(2n);
  });
});
