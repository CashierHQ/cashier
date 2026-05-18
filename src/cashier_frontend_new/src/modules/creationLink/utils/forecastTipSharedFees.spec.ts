import { describe, expect, it } from "vitest";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { FeeType } from "$modules/links/types/fee";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";
import {
  calculateIntentFees,
  IntentParticipants,
  TokenStandard as SharedTokenStandard,
} from "$shared";
import { forecastTipSharedFees } from "$modules/creationLink/utils/forecastTipSharedFees";

// Use the same canister id as the implementation (from constants)
const ICP_ID = ICP_LEDGER_CANISTER_ID;

function makeToken(
  overrides: Partial<TokenWithPriceAndBalance> & { address: string },
): TokenWithPriceAndBalance {
  return {
    name: "Test Token",
    symbol: "TKN",
    decimals: 8,
    fee: ICP_LEDGER_FEE,
    balance: 0n,
    enabled: true,
    is_default: false,
    priceUSD: 1,
    ...overrides,
  };
}

describe("forecastTipSharedFees", () => {
  it("returns empty array when linkAssets is empty", () => {
    const tokens: Record<string, TokenWithPriceAndBalance> = {};
    if (ICP_ID) {
      tokens[ICP_ID] = makeToken({ address: ICP_ID, symbol: "ICP" });
    }
    const result = forecastTipSharedFees([], 1, tokens);
    expect(result).toEqual([]);
  });

  it("skips assets whose token is not in the tokens map", () => {
    const unknownAddress = "unknown-canister-id";
    const result = forecastTipSharedFees(
      [{ address: unknownAddress, useAmount: 100_000_000n }],
      1,
      {},
    );
    // No token resolved -> no pair for asset; no ICP -> no link fee
    expect(result).toHaveLength(0);
  });

  it("returns one network-fee pair per asset and one link-creation fee when ICP token is present", () => {
    const tokenA = makeToken({
      address: "token-a",
      symbol: "TKNA",
      decimals: 8,
      fee: 10_000n,
      priceUSD: 2,
    });

    const tokens: Record<string, TokenWithPriceAndBalance> = {
      [tokenA.address]: tokenA,
    };
    if (ICP_ID) {
      tokens[ICP_ID] = makeToken({
        address: ICP_ID,
        symbol: "ICP",
        decimals: 8,
        fee: ICP_LEDGER_FEE,
        priceUSD: 5,
      });
    }

    const useAmount = 1_000_000_00n; // 1 token in 8 decimals
    const maxUse = 2;

    const result = forecastTipSharedFees(
      [{ address: tokenA.address, useAmount }],
      maxUse,
      tokens,
    );

    // 1 asset pair (TKNA) + optionally 1 link creation fee (ICP) when ICP_LEDGER_CANISTER_ID is set
    expect(result.length).toBeGreaterThanOrEqual(1);

    const assetPair = result.find((p) => p.asset.symbol === "TKNA");
    expect(assetPair).toBeDefined();

    // Asset pair: uses CreatorToLink formula from shared package
    if (assetPair?.fee) {
      expect(assetPair.fee.feeType).toBe(FeeType.NETWORK_FEE);
      expect(assetPair.asset.symbol).toBe("TKNA");
      expect(assetPair.asset.address).toBe(tokenA.address);

      const expectedFees = calculateIntentFees({
        intent_participants: IntentParticipants.CreatorToLink,
        token_standard: SharedTokenStandard.ICRC1,
        user_input_amount: useAmount,
        max_use: maxUse,
        asset_network_fee: tokenA.fee!,
      });
      expect(assetPair.fee.amount).toBe(
        BigInt(expectedFees.intent_total_network_fee),
      );
    }

    const linkFeePair = result.find(
      (p) => p.fee?.feeType === FeeType.CREATE_LINK_FEE,
    );
    if (ICP_ID && linkFeePair?.fee) {
      expect(linkFeePair.asset.symbol).toBe("ICP");
      const linkCreationFeeAmount = 10_000n;
      const treasuryFees = calculateIntentFees({
        intent_participants: IntentParticipants.CreatorToTreasury,
        token_standard: SharedTokenStandard.ICRC2,
        link_creation_fee: linkCreationFeeAmount,
        asset_network_fee: ICP_LEDGER_FEE,
      });
      expect(linkFeePair.fee.amount).toBe(BigInt(treasuryFees.intent_user_fee));
    }
  });

  it.skipIf(!ICP_ID)(
    "uses ICRC2 for ICP ledger asset when address matches ICP_LEDGER_CANISTER_ID",
    () => {
      const icpToken = makeToken({
        address: ICP_ID,
        symbol: "ICP",
        decimals: 8,
        fee: ICP_LEDGER_FEE,
      });
      const tokens: Record<string, TokenWithPriceAndBalance> = {
        [ICP_ID]: icpToken,
      };

      const useAmount = 100_000_000n; // 1 ICP
      const maxUse = 1;

      const result = forecastTipSharedFees(
        [{ address: ICP_ID, useAmount }],
        maxUse,
        tokens,
      );

      const assetPair = result.find(
        (p) =>
          p.asset.address === ICP_ID && p.fee?.feeType === FeeType.NETWORK_FEE,
      );
      expect(assetPair).toBeDefined();

      // Implementation uses ICRC2 for ICP ledger: inbound 2x + outbound maxUse
      const expectedFees = calculateIntentFees({
        intent_participants: IntentParticipants.CreatorToLink,
        token_standard: SharedTokenStandard.ICRC2,
        user_input_amount: useAmount,
        max_use: maxUse,
        asset_network_fee: ICP_LEDGER_FEE,
      });
      expect(assetPair!.fee!.amount).toBe(
        BigInt(expectedFees.intent_total_network_fee),
      );
    },
  );

  it("includes usdValueStr when token has priceUSD", () => {
    const token = makeToken({
      address: "tkn",
      symbol: "T",
      priceUSD: 10,
      decimals: 8,
      fee: 5_000n,
    });
    const tokens: Record<string, TokenWithPriceAndBalance> = {
      [token.address]: token,
    };

    const result = forecastTipSharedFees(
      [{ address: token.address, useAmount: 1_000_000_00n }],
      1,
      tokens,
    );

    // No ICP in map -> only asset pair, no link fee
    expect(result.length).toBe(1);
    expect(result[0].asset.usdValueStr).toBeDefined();
    expect(result[0].fee?.usdValueStr).toBeDefined();
  });
});
