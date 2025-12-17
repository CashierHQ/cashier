// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import type { Asset } from "$modules/links/types/link/asset";

/**
 * Balance for an asset
 * Access address via asset.address (Principal)
 */
export type AssetBalance = {
  asset: Asset;
  balance: bigint;
  /** Pre-formatted balance string for display (e.g., "1,234.56") */
  formattedBalance: string;
};
