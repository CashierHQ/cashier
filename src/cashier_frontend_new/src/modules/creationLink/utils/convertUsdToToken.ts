// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/**
 * Converts USD amount to token amount
 * @param usdAmount - USD amount to convert
 * @param tokenUsdPrice - Price of token in USD
 * @returns Token amount
 */
export function convertUsdToToken(
  usdAmount: number,
  tokenUsdPrice: number,
): number {
  if (tokenUsdPrice <= 0) {
    throw new Error("Token USD price must be greater than 0");
  }

  if (usdAmount < 0) {
    throw new Error("USD amount cannot be negative");
  }

  return usdAmount / tokenUsdPrice;
}
