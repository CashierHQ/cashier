import { describe, it, expect } from "vitest";
import { Principal } from "@dfinity/principal";
import Icrc112Request from "./icrc112Request";
import type { Icrc112Request as BackendIcrc112Request } from "$lib/generated/cashier_backend/cashier_backend.did";

describe("Icrc112Request.fromBackendType", () => {
  it("parses arg and nonce arrays", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const backend: BackendIcrc112Request = {
      arg: [1, 2, 3],
      method: "m",
      canister_id: p,
      nonce: [new Uint8Array([7, 8])],
    };

    const r = Icrc112Request.fromBackendType(backend);
    expect(r.method).toBe("m");
    expect(r.canister_id.toText()).toBe(p.toText());
  });
});
