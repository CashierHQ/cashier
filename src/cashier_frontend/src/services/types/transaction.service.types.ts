// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Principal } from "@dfinity/principal";

export type Icrc112RequestModel = {
  arg: Uint8Array | number[];
  method: string;
  canisterId: Principal;
  nonce?: Uint8Array | number[];
};

// Type-safe converter: returns ArrayBuffer representing only the bytes of the input
export const toArrayBuffer = (input: Uint8Array | number[]): ArrayBuffer => {
  if (input instanceof Uint8Array) {
    // If the view covers the whole underlying ArrayBuffer and it's actually an ArrayBuffer,
    // we can return it without copying. Otherwise create a new ArrayBuffer to avoid
    // returning a SharedArrayBuffer (which causes the type error).
    if (
      input.byteOffset === 0 &&
      input.byteLength === input.buffer.byteLength &&
      input.buffer instanceof ArrayBuffer
    ) {
      return input.buffer;
    }
    // Create a new ArrayBuffer that contains only the bytes represented by the view.
    return new Uint8Array(input).buffer;
  }
  // number[] -> Uint8Array -> ArrayBuffer (copy)
  return new Uint8Array(input).buffer;
};
// ...existing code.
