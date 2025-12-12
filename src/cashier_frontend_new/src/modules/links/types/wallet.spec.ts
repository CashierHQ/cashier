import { describe, it, expect } from "vitest";
import { Principal } from "@dfinity/principal";
import Wallet from "./wallet";
import type { Wallet as BackendWallet } from "$lib/generated/cashier_backend/cashier_backend.did";

describe("Wallet.fromBackendType", () => {
  it("maps IC wallet to frontend Wallet", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const backend: BackendWallet = { IC: { address: p, subaccount: [] } };
    const w = Wallet.fromBackendType(backend);
    expect(w.address.toText()).toBe(p.toText());
    expect(w.subaccount).toBeNull();
  });
});
