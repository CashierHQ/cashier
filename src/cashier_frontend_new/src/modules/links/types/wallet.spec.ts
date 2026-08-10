import { describe, it, expect } from "vitest";
import { Principal } from "@icp-sdk/core/principal";
import Wallet from "$modules/links/types/wallet";

describe("Wallet", () => {
  it("constructs a wallet without a subaccount", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const w = new Wallet(p, null);

    expect(w.address.toText()).toBe(p.toText());
    expect(w.subaccount).toBeNull();
  });
});
