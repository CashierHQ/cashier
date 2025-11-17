import type { Icrc112Request as BackendIcrc112Request } from "$lib/generated/cashier_backend/cashier_backend.did";
import type { Principal } from "@dfinity/principal";
import { fromNullable } from "@dfinity/utils";

// Frontend representation of an ICRC-112 request
export type Icrc112Requests = Icrc112Request[][];

export type Icrc112Request = {
  arg: ArrayBuffer;
  method: string;
  canister_id: Principal;
  nonce?: ArrayBuffer;
};

export class Icrc112RequestMapper {
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

    return {
      arg: arg as ArrayBuffer,
      method: b.method,
      canister_id: b.canister_id,
      nonce: nonceArray as ArrayBuffer | undefined,
    };
  }
}

export type Icrc112Response = {
  isSuccess: boolean;
  errors: string[] | null;
};
