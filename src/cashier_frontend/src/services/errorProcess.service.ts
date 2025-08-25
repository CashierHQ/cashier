// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export const getCashierError = (error: Error): Error => {
  if (error.message.includes("Insufficient balance")) {
    return new Error("Insufficient balance.");
  } else return error;
};

export const isCashierError = (error: unknown): error is Error => {
  return error instanceof Error;
};
