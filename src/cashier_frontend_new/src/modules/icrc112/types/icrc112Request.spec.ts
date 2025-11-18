import type { Icrc112Request as BackendIcrc112Request } from "$lib/generated/cashier_backend/cashier_backend.did";
import { Principal } from "@dfinity/principal";
import { describe, expect, it } from "vitest";
import Icrc112Request, { Icrc112RequestMapper } from "./icrc112Request";

describe("Icrc112Request.fromBackendType", () => {
  it("parses arg and nonce arrays", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const backend: BackendIcrc112Request = {
      arg: [1, 2, 3],
      method: "m",
      canister_id: p,
      nonce: [new Uint8Array([7, 8])],
    };

    const r = Icrc112RequestMapper.fromBackendType(backend);
    expect(r.method).toBe("m");
    expect(r.canister_id.toText()).toBe(p.toText());
  });

  it("serializes and deserializes an Icrc112Request via serde", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const arg = new Uint8Array([1, 2, 3]).buffer as ArrayBuffer;
    const nonce = new Uint8Array([9, 9]).buffer as ArrayBuffer;
    const req = Icrc112RequestMapper.fromBackendType({
      arg: [1, 2, 3],
      method: "transfer",
      canister_id: p,
      nonce: [new Uint8Array([9, 9])],
    } as BackendIcrc112Request);

    const ser = Icrc112RequestMapper.serde.serialize.Icrc112Request(req);
    expect(ser).toBeDefined();
    const serTyped = ser as {
      arg: number[];
      method: string;
      canister_id: string;
      nonce?: number[] | null;
    };
    expect(serTyped.method).toBe("transfer");

    const des = Icrc112RequestMapper.serde.deserialize.Icrc112Request(
      ser,
    ) as Icrc112Request;
    expect(des.method).toBe("transfer");
    expect(des.canister_id.toText()).toBe(p.toText());
    expect(new Uint8Array(des.arg)).toEqual(new Uint8Array(arg));
    if (des.nonce)
      expect(new Uint8Array(des.nonce)).toEqual(new Uint8Array(nonce));
  });
});
