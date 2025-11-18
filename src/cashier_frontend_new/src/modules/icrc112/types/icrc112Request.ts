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

  // Devalue serde for Icrc112Request: serialize ArrayBuffers to number[] and
  // Principals to text, and reconstruct on deserialize.
  static serde = {
    serialize: {
      Icrc112Request: (value: unknown) => {
        if (!(value instanceof Icrc112Request)) return undefined;

        return {
          arg: Array.from(new Uint8Array(value.arg)),
          method: value.method,
          canister_id: value.canister_id.toString(),
          nonce: value.nonce ? Array.from(new Uint8Array(value.nonce)) : null,
        };
      },
    },
    deserialize: {
      Icrc112Request: (obj: unknown) => {
        const s = obj as ReturnType<
          typeof Icrc112RequestMapper.serde.serialize.Icrc112Request
        >;

        if (!s) {
          throw new Error("Invalid serialized Icrc112Request object");
        }

        const argBuf = new Uint8Array(s.arg).buffer;
        const nonceBuf = s.nonce ? new Uint8Array(s.nonce).buffer : undefined;
        return new Icrc112Request(
          argBuf,
          s.method,
          Principal.fromText(s.canister_id),
          nonceBuf,
        );
      },
    },
  };
}

export type Icrc112ExecutionResult = {
  isSuccess: boolean;
  errors: string[] | null;
};
