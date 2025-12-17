// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { parse as uuidParse } from "uuid";
import { Ok, type Result } from "ts-results-es";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { authState } from "$modules/auth/state/auth.svelte";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import type { Asset } from "$modules/links/types/link/asset";
import type { AssetBalance } from "../types/balanceTypes";

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
   * @param assets - Array of Asset objects (chain + address)
   * @returns Result with array of AssetBalance or Error
   */
  async fetchAssetBalances(
    linkId: string,
    assets: Asset[],
  ): Promise<Result<AssetBalance[], Error>> {
    if (!linkId || assets.length === 0) {
      return Ok([]);
    }

    const agent = authState.buildAnonymousAgent();
    // Construct the account identifier for the link
    const account = {
      owner: Principal.fromText(CASHIER_BACKEND_CANISTER_ID),
      subaccount: linkIdToSubaccount(linkId),
    };

    // Filter IC assets with valid address
    const icAssets = assets.filter(
      (asset) => asset.chain === "IC" && asset.address,
    );

    // Create balance fetch tasks for each asset
    const tasks = icAssets.map(async (asset): Promise<AssetBalance> => {
      const ledger = IcrcLedgerCanister.create({
        agent,
        canisterId: asset.address!, // we already filtered for address presence
      });
      const balance = await ledger.balance(account);
      // formattedBalance is set to "-" here, store will override with proper formatting
      return { asset, balance, formattedBalance: "-" };
    });

    // Use allSettled to handle individual failures gracefully
    const settled = await Promise.allSettled(tasks);
    const results: AssetBalance[] = settled.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      // Return 0 balance on individual ledger failure
      return { asset: icAssets[index], balance: BigInt(0), formattedBalance: "-" };
    });

    return Ok(results);
  }
}

export const linkAssetBalanceService = new LinkAssetBalanceService();
