import type { Principal } from "@dfinity/principal";
import type { Icrc112Request as BackendIcrc112Request } from "$lib/generated/cashier_backend/cashier_backend.did";

export class Icrc112Request {
  constructor(
    public arg: Uint8Array | number[],
    public method: string,
    public canister_id: Principal,
    public nonce?: Uint8Array | number[],
  ) {}

  static fromBackendType(b: BackendIcrc112Request): Icrc112Request {
    const nonce = b.nonce && b.nonce.length === 1 ? b.nonce[0] : undefined;
    return new Icrc112Request(arg, b.method, b.canister_id, nonce);
  }
}

export default Icrc112Request;
