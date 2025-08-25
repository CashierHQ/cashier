// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export function generate<T>(
  length: number,
  generatorFn: (index: number, array: T[]) => T,
) {
  const arr = new Array(length);

  for (let i = 0; i < length; i++) {
    arr[i] = generatorFn(i, arr);
  }

  return arr;
}
