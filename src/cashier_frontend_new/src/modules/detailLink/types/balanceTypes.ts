// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import type { Asset } from "$modules/links/types/link/asset";

/**
 * Balance for an asset with token metadata for display
 * Access address via asset.address (Principal)
 */
export type AssetBalance = {
  asset: Asset;
  balance: bigint;
  /** Pre-formatted balance string for display (e.g., "1,234.56") */
  formattedBalance: string;
  /** Token symbol (e.g., "ICP") */
  symbol: string;
  /** Token logo URL */
  logo: string;
  /** USD value of balance */
  usdValue: number;
};
