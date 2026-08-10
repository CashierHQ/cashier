import { describe, it, expect } from "vitest";
import { Principal } from "@icp-sdk/core/principal";
import {
  TransferData,
  TransferFromData,
} from "$modules/links/types/action/intentType";
import Asset from "$modules/links/types/asset";
import Wallet from "$modules/links/types/wallet";

describe("IntentType payloads", () => {
  it("constructs TransferData correctly", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const to = new Wallet(p, null);
    const from = new Wallet(p, null);
    const asset = Asset.IC(p);

    const td = new TransferData(to, asset, from, 10n);
    expect(td.amount).toBe(10n);
    expect(td.to.address.toText()).toBe(p.toText());
  });

  it("constructs TransferFromData correctly", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const to = new Wallet(p, null);
    const from = new Wallet(p, null);
    const asset = Asset.IC(p);
    const spender = new Wallet(p, null);

    const tfd = new TransferFromData(to, asset, from, 5n, 10n, 2n, spender);

    expect(tfd.amount).toBe(10n);
    expect(tfd.actual_amount).toBe(5n);
    expect(tfd.approve_amount).toBe(2n);
  });
});
