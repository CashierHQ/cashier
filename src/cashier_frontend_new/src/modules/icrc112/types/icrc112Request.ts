import type { Icrc112Request as BackendIcrc112Request } from "$lib/generated/cashier_backend/cashier_backend.did";
import { Principal } from "@dfinity/principal";
import { fromNullable } from "@dfinity/utils";

// Frontend representation of an ICRC-112 request
export type Icrc112Requests = Icrc112Request[][];

class Icrc112Request {
  constructor(
    public arg: ArrayBuffer,
    public method: string,
    public canister_id: Principal,
    public nonce?: ArrayBuffer,
  ) {}
}

export default Icrc112Request;

// Mapper helper for Icrc112Request to match repository patterns
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

  // Devalue serde for Icrc112Request
  static serde = {
    serialize: {
      Icrc112Request: (value: unknown) => {
        if (!(value instanceof Object)) return undefined;
        const r = value as Icrc112Request;
        return {
          arg: Array.from(new Uint8Array(r.arg)),
          method: r.method,
          canister_id: r.canister_id.toString(),
          nonce: r.nonce ? Array.from(new Uint8Array(r.nonce)) : undefined,
        };
      },
    },
    deserialize: {
      Icrc112Request: (obj: unknown) => {
        const s = obj as {
          arg: number[];
          method: string;
          canister_id: string;
          nonce?: number[];
        };
        return new Icrc112Request(
          new Uint8Array(s.arg).buffer,
          s.method,
          Principal.fromText(s.canister_id),
          s.nonce ? new Uint8Array(s.nonce).buffer : undefined,
        );
      },
    },
  };
}

export type Icrc112ExecutionResult = {
  isSuccess: boolean;
  errors: string[] | null;
};
