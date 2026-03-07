// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export const convert = (
  amount: number | undefined,
  rate: number | undefined,
): number | undefined =>
  amount != null && rate != null ? amount * rate : undefined;
