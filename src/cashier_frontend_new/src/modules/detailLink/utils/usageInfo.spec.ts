import { Asset, AssetInfo } from "$modules/links/types/link/asset";
import { Link } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Principal } from "@dfinity/principal";
import { Err, Ok } from "ts-results-es";
import { describe, expect, it, vi } from "vitest";
import { calculateUsageInfoAssetsWithTokenInfo } from "./usageInfo";

function fixture_of_token(): TokenWithPriceAndBalance {
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
  };
}

function fixture_of_link_with_available_amount(
  available_amount?: bigint,
): Link {
  return new Link(
    "link-1",
    "Link",
    Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
    [
      new AssetInfo(
        Asset.IC(Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai")),
        100_000_000n,
        "ICP",
        available_amount,
      ),
    ],
    LinkType.TIP,
    1n,
    LinkState.ACTIVE,
    3n,
    1n,
  );
}

describe("calculateUsageInfoAssetsWithTokenInfo", () => {
  it("it_should_fail_do_return_empty_assets_due_to_missing_token_lookup", () => {
    // Arrange
    const link = fixture_of_link_with_available_amount(150_000_000n);
    const findTokenByAddress = vi.fn(() => Err(new Error("missing token")));

    // Act
    const result = calculateUsageInfoAssetsWithTokenInfo(
      link,
      findTokenByAddress,
    );

    // Assert
    expect(result).toEqual([]);
  });

  it("it_should_do_use_available_amount_when_present", () => {
    // Arrange
    const link = fixture_of_link_with_available_amount(150_000_000n);
    const findTokenByAddress = vi.fn(() => Ok(fixture_of_token()));

    // Act
    const result = calculateUsageInfoAssetsWithTokenInfo(
      link,
      findTokenByAddress,
    );

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(1.5);
  });

  it("it_should_do_fallback_to_remaining_uses_amount_when_available_amount_missing", () => {
    // Arrange
    const link = fixture_of_link_with_available_amount(undefined);
    const findTokenByAddress = vi.fn(() => Ok(fixture_of_token()));

    // Act
    const result = calculateUsageInfoAssetsWithTokenInfo(
      link,
      findTokenByAddress,
    );

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(2);
  });
});
