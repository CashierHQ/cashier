import type { Principal } from "@dfinity/principal";
import type { Icrc112Request as BackendIcrc112Request } from "$lib/generated/cashier_backend/cashier_backend.did";
import { fromNullable } from "@dfinity/utils";

// Frontend representation of an ICRC-112 request
export class Icrc112Request {
  constructor(
    public arg: ArrayBuffer,
    public method: string,
    public canister_id: Principal,
    public nonce?: ArrayBuffer,
  ) {}

  /**
   * Convert from backend Icrc112Request to frontend Icrc112Request
   * @param b BackendIcrc112Request from backend
   * @returns Icrc112Request instance
   */
  static fromBackendType(b: BackendIcrc112Request): Icrc112Request {
    const nonce = fromNullable(b.nonce);
    const arg = Array.isArray(b.arg)
      ? new Uint8Array(b.arg).buffer
      : b.arg instanceof Uint8Array
        ? b.arg.buffer
        : b.arg;
    const nonceArray =
      nonce && Array.isArray(nonce)
        ? new Uint8Array(nonce).buffer
        : nonce instanceof Uint8Array
          ? nonce.buffer
          : nonce;
    return new Icrc112Request(
      arg as ArrayBuffer,
      b.method,
      b.canister_id,
      nonceArray as ArrayBuffer | undefined,
    );
  }
}

export default Icrc112Request;
