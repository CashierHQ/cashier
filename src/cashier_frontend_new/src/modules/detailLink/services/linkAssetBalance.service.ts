// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { parse as uuidParse } from "uuid";
import { Ok, Err, type Result } from "ts-results-es";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { authState } from "$modules/auth/state/auth.svelte";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import type { BalanceItem } from "../types/balanceTypes";

/**
 * Convert link UUID to 32-byte subaccount
 * DO NOT CHANGE BYTE ORDER - matches backend expectation
 */
export const linkIdToSubaccount = (id: string): Uint8Array => {
  const subaccount = new Uint8Array(32);
  subaccount.set(uuidParse(id), 0);
  return subaccount;
};

/**
 * Service for fetching link asset balances from ICRC ledgers
 */
class LinkAssetBalanceService {
  /**
   * Fetch balances for multiple assets associated with a link
   * @param linkId - UUID of the link
   * @param assetAddresses - Array of token canister IDs (as strings)
   * @returns Result with array of BalanceItems or Error
   */
  async fetchAssetBalances(
    linkId: string,
    assetAddresses: string[],
  ): Promise<Result<BalanceItem[], Error>> {
    if (!linkId || assetAddresses.length === 0) {
      return Ok([]);
    }

    const agent = authState.buildAnonymousAgent();
    const account = {
      owner: Principal.fromText(CASHIER_BACKEND_CANISTER_ID),
      subaccount: linkIdToSubaccount(linkId),
    };

    try {
      const tasks = assetAddresses.map(async (addr) => {
        const ledger = IcrcLedgerCanister.create({
          agent,
          canisterId: Principal.fromText(addr),
        });
        try {
          const balance = await ledger.balance(account);
          return { tokenAddress: Principal.fromText(addr), balance };
        } catch {
          // Return 0 balance on individual ledger failure
          return { tokenAddress: Principal.fromText(addr), balance: BigInt(0) };
        }
      });

      const results = await Promise.all(tasks);
      return Ok(results);
    } catch (e) {
      return Err(e as Error);
    }
  }
}

export const linkAssetBalanceService = new LinkAssetBalanceService();
