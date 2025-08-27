// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { toBase64 } from "@slide-computer/signer";

export type Icrc112RequestModel = {
  arg: Uint8Array | number[];
  method: string;
  canisterId: string;
  nonce?: string;
};

// Type-safe converter: returns ArrayBuffer representing only the bytes of the input
const toArrayBuffer = (input: Uint8Array | number[]): ArrayBuffer => {
  if (input instanceof Uint8Array) {
    // If the view covers the whole underlying ArrayBuffer and it's actually an ArrayBuffer,
    // we can return it without copying. Otherwise create a new ArrayBuffer to avoid
    // returning a SharedArrayBuffer (which causes the type error).
    if (input.byteOffset === 0 &&
      input.byteLength === input.buffer.byteLength &&
      input.buffer instanceof ArrayBuffer) {
      return input.buffer;
    }
    // Create a new ArrayBuffer that contains only the bytes represented by the view.
    return new Uint8Array(input).buffer;
  }
  // number[] -> Uint8Array -> ArrayBuffer (copy)
  return new Uint8Array(input).buffer;
};
// ...existing code.


export const toRPCRequest = (req: Icrc112RequestModel): {
  arg: string;
  canisterId: string;
  method: string;
  nonce?: string;
} => {
  return {
    arg: toBase64(toArrayBuffer(req.arg)),
    method: req.method,
    canisterId: req.canisterId,
    nonce: req.nonce,
  };
}