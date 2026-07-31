import type { Icrc112Request as BackendIcrc112Request } from "$lib/generated/cashier_backend/cashier_backend.did";
import { Principal } from "@icp-sdk/core/principal";
import { describe, expect, it } from "vitest";
import { Icrc112RequestMapper } from "$modules/icrc112/types/icrc112Request";

describe("Icrc112Request.fromBackendType", () => {
  it("parses arg and nonce arrays", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const backend: BackendIcrc112Request = {
      arg: [1, 2, 3],
      method: "m",
      canister_id: p,
      nonce: [new Uint8Array([7, 8])],
      intent_ids: ["intent-1", "intent-2"],
    };

    const r = Icrc112RequestMapper.fromBackendType(backend);
    expect(r.method).toBe("m");
    expect(r.canister_id.toText()).toBe(p.toText());
    expect(r.intentIds).toEqual(["intent-1", "intent-2"]);
  });

  it("defaults intentIds to an empty array when absent", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const backend: BackendIcrc112Request = {
      arg: [1, 2, 3],
      method: "m",
      canister_id: p,
      nonce: [],
      intent_ids: [],
    };

    const r = Icrc112RequestMapper.fromBackendType(backend);
    expect(r.intentIds).toEqual([]);
  });
});
