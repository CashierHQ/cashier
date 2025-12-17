// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import type { Principal } from "@dfinity/principal";

/**
 * Balance item for a single token
 * Used to represent balance fetched from ICRC ledger
 */
export interface BalanceItem {
  /** Token canister principal */
  tokenAddress: Principal;
  /** Raw balance in token's smallest unit (e8s for ICP) */
  balance: bigint;
}
