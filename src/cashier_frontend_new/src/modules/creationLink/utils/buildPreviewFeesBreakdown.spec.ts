import { FeeType } from "$modules/links/types/fee";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Err, Ok } from "ts-results-es";
import { describe, expect, it, vi } from "vitest";
import { buildPreviewFeesBreakdown } from "$modules/creationLink/utils/buildPreviewFeesBreakdown";

function fixture_of_token(
  overrides?: Partial<TokenWithPriceAndBalance>,
): TokenWithPriceAndBalance {
  return {
    name: "Internet Computer",
    address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
    symbol: "ICP",
    decimals: 8,
    fee: 10_000n,
    priceUSD: 5,
    balance: 0n,
    enabled: true,
    is_default: true,
    ...overrides,
  };
}

function fixture_of_forecast_asset_and_fee_list() {
  return [
    {
      asset: {
        label: "",
        symbol: "ckUSDC",
        address: "token-ckusdc-address",
        amount: "1.1003",
        usdValueStr: "1.1",
      },
      fee: {
        feeType: FeeType.NETWORK_FEE,
        amount: 300n,
        amountFormattedStr: "0.0003",
        symbol: "ckUSDC",
        price: 1,
        usdValue: 0.0003,
        usdValueStr: "0.0003",
      },
    },
    {
      asset: {
        label: "Create link fee",
        symbol: "ICP",
        address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        amount: "0.0003",
        usdValueStr: "0.0015",
      },
      fee: {
        feeType: FeeType.CREATE_LINK_FEE,
        amount: 30_000n,
        amountFormattedStr: "0.0003",
        symbol: "ICP",
        price: 5,
        usdValue: 0.0015,
        usdValueStr: "0.0015",
      },
    },
  ];
}

describe("buildPreviewFeesBreakdown", () => {
  it("it_should_fail_return_empty_breakdown_due_to_empty_forecast_fees", () => {
    // Arrange
    const findTokenByAddress = vi.fn(() => Ok(fixture_of_token()));

    // Act
    const result = buildPreviewFeesBreakdown([], findTokenByAddress);

    // Assert
    expect(result).toEqual([]);
    expect(findTokenByAddress).not.toHaveBeenCalled();
  });

  it("it_should_fail_skip_item_due_to_missing_token_lookup", () => {
    // Arrange
    const forecastAssetAndFees = fixture_of_forecast_asset_and_fee_list();
    const findTokenByAddress = vi.fn((address: string) => {
      if (address === "ryjl3-tyaaa-aaaaa-aaaba-cai") {
        return Ok(fixture_of_token());
      }
      return Err(new Error("missing token"));
    });

    // Act
    const result = buildPreviewFeesBreakdown(
      forecastAssetAndFees,
      findTokenByAddress,
    );

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Link creation fee");
  });

  it("it_should_do_map_network_fee_items_from_forecast_fees", () => {
    // Arrange
    const forecastAssetAndFees = fixture_of_forecast_asset_and_fee_list();
    const findTokenByAddress = vi.fn((address: string) =>
      Ok(
        fixture_of_token({
          address,
          symbol: address === "token-ckusdc-address" ? "ckUSDC" : "ICP",
          decimals: address === "token-ckusdc-address" ? 6 : 8,
        }),
      ),
    );

    // Act
    const result = buildPreviewFeesBreakdown(
      forecastAssetAndFees,
      findTokenByAddress,
    );

    // Assert
    expect(result[0]).toMatchObject({
      name: "Network fee",
      amount: 300n,
      tokenAddress: "token-ckusdc-address",
      tokenSymbol: "ckUSDC",
      tokenDecimals: 6,
      usdAmount: 0.0003,
    });
  });

  it("it_should_do_map_link_creation_fee_from_forecast_fees", () => {
    // Arrange
    const forecastAssetAndFees = fixture_of_forecast_asset_and_fee_list();
    const findTokenByAddress = vi.fn((address: string) =>
      Ok(
        fixture_of_token({
          address,
          symbol: address === "token-ckusdc-address" ? "ckUSDC" : "ICP",
          decimals: address === "token-ckusdc-address" ? 6 : 8,
        }),
      ),
    );

    // Act
    const result = buildPreviewFeesBreakdown(
      forecastAssetAndFees,
      findTokenByAddress,
    );

    // Assert
    expect(result[1]).toMatchObject({
      name: "Link creation fee",
      amount: 30_000n,
      tokenAddress: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      tokenSymbol: "ICP",
      tokenDecimals: 8,
      usdAmount: 0.0015,
    });
  });

  it("it_should_do_preserve_token_and_usd_values_when_building_breakdown", () => {
    // Arrange
    const forecastAssetAndFees = fixture_of_forecast_asset_and_fee_list();
    const findTokenByAddress = vi.fn((address: string) =>
      Ok(
        fixture_of_token({
          address,
          symbol: address === "token-ckusdc-address" ? "ckUSDC" : "ICP",
          decimals: address === "token-ckusdc-address" ? 6 : 8,
        }),
      ),
    );

    // Act
    const result = buildPreviewFeesBreakdown(
      forecastAssetAndFees,
      findTokenByAddress,
    );

    // Assert
    expect(result.map((item) => item.tokenSymbol)).toEqual(["ckUSDC", "ICP"]);
    expect(result.map((item) => item.usdAmount)).toEqual([0.0003, 0.0015]);
  });
});
