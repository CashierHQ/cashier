import { feeService } from "$modules/shared/services/feeService";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import {
  LinkState,
  LinkType as SharedLinkType,
  TokenStandard as SharedTokenStandard,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinkType } from "$modules/links/types/link/linkType";
import { validationService } from "$modules/links/services/validationService";
import {
  CreateLinkAsset,
  CreateLinkData,
} from "$modules/creationLink/types/createLinkData";

describe("validateRequiredAmount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return an error if no assets are provided", () => {
    const mockWalletTokens: TokenWithPriceAndBalance[] = [];
    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe("No assets provided for validation");
    }
  });

  it("should return an error if wallet tokens data is not available", () => {
    const mockWalletTokens: TokenWithPriceAndBalance[] = [];
    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("0xtoken1", 1000n)],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe("Wallet tokens data is not available");
    }
  });

  it("should return an error if token is not found in wallet", () => {
    // mock walletStore to have token with insufficient balance
    const mockWalletTokens: TokenWithPriceAndBalance[] = [
      {
        name: "token1",
        symbol: "TKN1",
        address: "0xtoken1",
        decimals: 8,
        enabled: true,
        fee: 10_000n,
        is_default: false,
        balance: 1_000_000n,
        priceUSD: 1.0,
      },
    ];

    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("0xtoken2", 1_000_000n)],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        "Token with address 0xtoken2 not found in wallet",
      );
    }
  });

  it("should return an error if insufficient amount for an asset", () => {
    // mock walletStore to have token with insufficient balance
    const mockWalletTokens: TokenWithPriceAndBalance[] = [
      {
        name: "token1",
        symbol: "TKN1",
        address: "0xtoken1",
        decimals: 8,
        enabled: true,
        fee: 10_000n,
        is_default: false,
        balance: 1_000_000n,
        priceUSD: 1.0,
      },
      {
        name: "token2",
        symbol: "TKN2",
        address: "0xtoken2",
        decimals: 8,
        enabled: true,
        fee: 10_000n,
        is_default: false,
        balance: 5_000_000n,
        priceUSD: 1.0,
      },
    ];

    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("0xtoken1", 1_000_000n)],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        "Insufficient amount for asset 0xtoken1, required: 2030000, available: 1000000",
      );
    }
  });

  it("should validate successfully when sufficient amounts are available", () => {
    // mock walletStore to have token with insufficient balance
    const mockWalletTokens: TokenWithPriceAndBalance[] = [
      {
        name: "token1",
        symbol: "TKN1",
        address: "0xtoken1",
        decimals: 8,
        enabled: true,
        fee: 10_000n,
        is_default: false,
        balance: 3_000_000n,
        priceUSD: 1.0,
      },
      {
        name: "token2",
        symbol: "TKN2",
        address: "0xtoken2",
        decimals: 8,
        enabled: true,
        fee: 10_000n,
        is_default: false,
        balance: 5_000_000n,
        priceUSD: 1.0,
      },
    ];

    const createLinkData: CreateLinkData = new CreateLinkData({
      title: "testLink",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("0xtoken1", 1_000_000n)],
      maxUse: 2,
    });

    const result = validationService.validateRequiredAmount(
      createLinkData,
      mockWalletTokens,
    );
    expect(result.isOk()).toBe(true);
  });
});

// ─── V3 functions ────────────────────────────────────────────────────────────

const ASSET_PRINCIPAL = Principal.fromText("aaaaa-aa");
const FEE_PRINCIPAL = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
const FEE_TOKEN_ADDRESS = FEE_PRINCIPAL.toText();
const ASSET_TOKEN_ADDRESS = ASSET_PRINCIPAL.toText();
const NETWORK_FEE = 10_000n;
const LINK_CREATION_FEE = 10_000n;

const MOCK_FEE_CONFIG = {
  amount: LINK_CREATION_FEE,
  tokenAddress: FEE_TOKEN_ADDRESS,
  symbol: "ICP",
  decimals: 8,
};

function makeDraftLink(overrides?: Partial<SharedLink>): SharedLink {
  return {
    id: "draft-id",
    title: "Test Link",
    link_type: SharedLinkType.SendTip,
    link_state: LinkState.AddAsset,
    creator: ASSET_PRINCIPAL,
    asset_info: [
      {
        asset: {
          address: ASSET_PRINCIPAL,
          network_fee: NETWORK_FEE,
          token_standard: SharedTokenStandard.ICRC2,
        },
        amount: 500_000n,
        label: ASSET_TOKEN_ADDRESS,
      },
    ],
    max_use: 1n,
    use_count: 0n,
    ...overrides,
  };
}

function makeAssetToken(balance: bigint): TokenWithPriceAndBalance {
  return {
    name: "Asset Token",
    symbol: "TKN",
    address: ASSET_TOKEN_ADDRESS,
    decimals: 8,
    enabled: true,
    fee: NETWORK_FEE,
    is_default: false,
    balance,
    priceUSD: 1.0,
  };
}

function makeFeeToken(balance: bigint): TokenWithPriceAndBalance {
  return {
    name: "ICP",
    symbol: "ICP",
    address: FEE_TOKEN_ADDRESS,
    decimals: 8,
    enabled: true,
    fee: NETWORK_FEE,
    is_default: true,
    balance,
    priceUSD: 10.0,
    // ICRC-2 with hyphen as per TokenStandard enum value
    tokenStandards: ["ICRC-2"] as unknown as never[],
  };
}

describe("calculateRequiredAssetAmountV3", () => {
  // CreatorToLink:
  //   intent_total_amount = amount * maxUse
  //   intent_total_network_fee (ICRC2) = 2*fee + fee*maxUse
  //   intent_total_network_fee (ICRC1) = 1*fee + fee*maxUse
  //   required = intent_total_amount + intent_total_network_fee

  it("it_should_succeed_calculate_required_amount_for_icrc2_token_with_max_use_1", () => {
    // amount=500_000, maxUse=1, fee=10_000, ICRC2
    // total = 500_000*1 + (2*10_000 + 10_000*1) = 500_000 + 30_000 = 530_000
    const result = validationService.calculateRequiredAssetAmountV3(
      {
        address: ASSET_PRINCIPAL,
        network_fee: NETWORK_FEE,
        token_standard: SharedTokenStandard.ICRC2,
      },
      500_000n,
      1,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(530_000n);
  });

  it("it_should_succeed_calculate_required_amount_for_icrc2_token_with_max_use_3", () => {
    // amount=500_000, maxUse=3, fee=10_000, ICRC2
    // total = 500_000*3 + (2*10_000 + 10_000*3) = 1_500_000 + 50_000 = 1_550_000
    const result = validationService.calculateRequiredAssetAmountV3(
      {
        address: ASSET_PRINCIPAL,
        network_fee: NETWORK_FEE,
        token_standard: SharedTokenStandard.ICRC2,
      },
      500_000n,
      3,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(1_550_000n);
  });

  it("it_should_succeed_calculate_required_amount_for_icrc1_token", () => {
    // amount=500_000, maxUse=1, fee=10_000, ICRC1
    // total = 500_000*1 + (1*10_000 + 10_000*1) = 500_000 + 20_000 = 520_000
    const result = validationService.calculateRequiredAssetAmountV3(
      {
        address: ASSET_PRINCIPAL,
        network_fee: NETWORK_FEE,
        token_standard: SharedTokenStandard.ICRC1,
      },
      500_000n,
      1,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(520_000n);
  });
});

describe("calculateRequiredFeeAmountV3", () => {
  // CreatorToTreasury:
  //   intent_total_amount = link_creation_fee
  //   intent_total_network_fee (ICRC2) = 2*ledgerFee
  //   intent_total_network_fee (ICRC1) = 1*ledgerFee
  //   required = intent_total_amount + intent_total_network_fee

  it("it_should_succeed_calculate_required_fee_for_icrc2_token", () => {
    // feeAmount=10_000, ledgerFee=10_000, ICRC2
    // total = 10_000 + 2*10_000 = 30_000
    const result = validationService.calculateRequiredFeeAmountV3(
      LINK_CREATION_FEE,
      NETWORK_FEE,
      SharedTokenStandard.ICRC2,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(30_000n);
  });

  it("it_should_succeed_calculate_required_fee_for_icrc1_token", () => {
    // feeAmount=10_000, ledgerFee=10_000, ICRC1
    // total = 10_000 + 1*10_000 = 20_000
    const result = validationService.calculateRequiredFeeAmountV3(
      LINK_CREATION_FEE,
      NETWORK_FEE,
      SharedTokenStandard.ICRC1,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(20_000n);
  });
});

describe("validateRequiredAssetAmountV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(feeService, "getLinkCreationFee").mockReturnValue(MOCK_FEE_CONFIG);
  });

  // Asset: ICRC2, amount=500_000, max_use=1, networkFee=10_000
  //   required_asset = 500_000 + (2*10_000 + 10_000*1) = 530_000
  // Fee: ICRC2 (tokenStandards includes "ICRC-2"), feeAmount=10_000, ledgerFee=10_000
  //   required_fee = 10_000 + 2*10_000 = 30_000

  it("it_should_fail_validate_due_to_no_assets", () => {
    const draftLink = makeDraftLink({ asset_info: [] });
    const result = validationService.validateRequiredAssetAmountV3(draftLink, [
      makeFeeToken(1_000_000n),
    ]);
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      "No assets provided for validation",
    );
  });

  it("it_should_fail_validate_due_to_empty_wallet_tokens", () => {
    const draftLink = makeDraftLink();
    const result = validationService.validateRequiredAssetAmountV3(
      draftLink,
      [],
    );
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      "Wallet tokens data is not available",
    );
  });

  it("it_should_fail_validate_due_to_asset_amount_being_zero", () => {
    const draftLink = makeDraftLink({
      asset_info: [
        {
          asset: {
            address: ASSET_PRINCIPAL,
            network_fee: NETWORK_FEE,
            token_standard: SharedTokenStandard.ICRC2,
          },
          amount: 0n,
          label: ASSET_TOKEN_ADDRESS,
        },
      ],
    });
    const result = validationService.validateRequiredAssetAmountV3(draftLink, [
      makeAssetToken(1_000_000n),
      makeFeeToken(1_000_000n),
    ]);
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      "Asset amount must be greater than zero",
    );
  });

  it("it_should_fail_validate_due_to_asset_token_not_found_in_wallet", () => {
    const draftLink = makeDraftLink();
    // wallet only has the fee token, not the asset token
    const result = validationService.validateRequiredAssetAmountV3(draftLink, [
      makeFeeToken(1_000_000n),
    ]);
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      `Token with address ${ASSET_TOKEN_ADDRESS} not found in wallet`,
    );
  });

  it("it_should_fail_validate_due_to_insufficient_asset_balance", () => {
    // required_asset = 530_000, but balance = 500_000
    const draftLink = makeDraftLink();
    const result = validationService.validateRequiredAssetAmountV3(draftLink, [
      makeAssetToken(500_000n),
      makeFeeToken(1_000_000n),
    ]);
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      `Insufficient amount for asset ${ASSET_TOKEN_ADDRESS}, required: 530000, available: 500000`,
    );
  });

  it("it_should_fail_validate_due_to_fee_token_not_found_in_wallet", () => {
    // wallet only has the asset token, not the fee token
    const draftLink = makeDraftLink();
    const result = validationService.validateRequiredAssetAmountV3(draftLink, [
      makeAssetToken(1_000_000n),
    ]);
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      `Fee token with address ${FEE_TOKEN_ADDRESS} not found in wallet`,
    );
  });

  it("it_should_fail_validate_due_to_insufficient_fee_balance_when_fee_token_has_no_token_standards", () => {
    // tokenStandards undefined → defaults to ICRC2 → required_fee = 30_000, balance = 20_000
    const feeTokenNoStandards: TokenWithPriceAndBalance = {
      ...makeFeeToken(20_000n),
      tokenStandards: undefined,
    };
    const draftLink = makeDraftLink();
    const result = validationService.validateRequiredAssetAmountV3(draftLink, [
      makeAssetToken(1_000_000n),
      feeTokenNoStandards,
    ]);
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      `Insufficient amount for link creation fee, required: 30000, available: 20000`,
    );
  });

  it("it_should_fail_validate_due_to_insufficient_fee_balance", () => {
    // required_fee = 30_000, but fee token balance = 20_000
    const draftLink = makeDraftLink();
    const result = validationService.validateRequiredAssetAmountV3(draftLink, [
      makeAssetToken(1_000_000n),
      makeFeeToken(20_000n),
    ]);
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      `Insufficient amount for link creation fee, required: 30000, available: 20000`,
    );
  });

  it("it_should_fail_validate_due_to_insufficient_combined_balance_when_fee_token_is_also_asset_token", () => {
    // shared logic subtracts one duplicated ledger fee in combined requirement:
    // required_total = required_asset + required_fee - ledger_fee
    // required_total = 530_000 + 30_000 - 10_000 = 550_000
    // balance = 549_000 -> should fail
    const draftLink = makeDraftLink({
      asset_info: [
        {
          asset: {
            address: FEE_PRINCIPAL,
            network_fee: NETWORK_FEE,
            token_standard: SharedTokenStandard.ICRC2,
          },
          amount: 500_000n,
          label: FEE_TOKEN_ADDRESS,
        },
      ],
    });
    const result = validationService.validateRequiredAssetAmountV3(draftLink, [
      makeFeeToken(549_000n),
    ]);
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      `Insufficient amount for fee token ${FEE_TOKEN_ADDRESS}, required: 550000 (including both asset amount and fee), available: 549000`,
    );
  });

  it("it_should_succeed_validate_with_sufficient_balances", () => {
    // required_asset = 530_000, required_fee = 30_000
    const draftLink = makeDraftLink();
    const result = validationService.validateRequiredAssetAmountV3(draftLink, [
      makeAssetToken(600_000n),
      makeFeeToken(100_000n),
    ]);
    expect(result.isOk()).toBe(true);
  });

  it("it_should_succeed_validate_when_fee_token_is_also_asset_token_with_sufficient_combined_balance", () => {
    // asset uses fee token; required = 530_000 + 30_000 = 560_000
    const draftLink = makeDraftLink({
      asset_info: [
        {
          asset: {
            address: FEE_PRINCIPAL,
            network_fee: NETWORK_FEE,
            token_standard: SharedTokenStandard.ICRC2,
          },
          amount: 500_000n,
          label: FEE_TOKEN_ADDRESS,
        },
      ],
    });
    const result = validationService.validateRequiredAssetAmountV3(draftLink, [
      makeFeeToken(600_000n),
    ]);
    expect(result.isOk()).toBe(true);
  });
});

describe("calculateMaxAssetAmountV3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(feeService, "getLinkCreationFee").mockReturnValue(MOCK_FEE_CONFIG);
  });

  it("should return error when maxUse is not positive", () => {
    const result = validationService.calculateMaxAssetAmountV3(
      ASSET_TOKEN_ADDRESS,
      0,
      [makeAssetToken(1_000_000n), makeFeeToken(1_000_000n)],
    );

    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      "Max use must be greater than zero",
    );
  });

  it("should return error when fee token is missing in wallet", () => {
    const result = validationService.calculateMaxAssetAmountV3(
      ASSET_TOKEN_ADDRESS,
      2,
      [makeAssetToken(1_000_000n)],
    );

    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      `Fee token with address ${FEE_TOKEN_ADDRESS} not found in wallet`,
    );
  });

  it("should return error when target asset token is missing in wallet", () => {
    const result = validationService.calculateMaxAssetAmountV3(
      ASSET_TOKEN_ADDRESS,
      2,
      [makeFeeToken(1_000_000n)],
    );

    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toBe(
      `Token with address ${ASSET_TOKEN_ADDRESS} not found in wallet`,
    );
  });

  it("should calculate max per-use amount for non-fee token (max_use=1)", () => {
    // non-fee token, ICRC2, max_use=1:
    //   networkFee = 2*10_000 + 1*10_000 = 30_000
    //   availableBalance = 1_000_000 - 30_000 = 970_000
    //   max per-use = 970_000 / 1 = 970_000
    const result = validationService.calculateMaxAssetAmountV3(
      ASSET_TOKEN_ADDRESS,
      1,
      [makeAssetToken(1_000_000n), makeFeeToken(1_000_000n)],
    );

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe(970_000n);
  });

  it("should calculate max per-use amount for non-fee token and default unknown standards to ICRC2 (max_use=2)", () => {
    const assetTokenNoStandards: TokenWithPriceAndBalance = {
      ...makeAssetToken(1_000_000n),
      tokenStandards: undefined,
    };

    // non-fee token formula (unknown standard defaults to ICRC2, max_use=2):
    //   inboundMultiplier = 2 (ICRC2)
    //   networkFee = 2*10_000 + 2*10_000 = 40_000
    //   availableBalance = 1_000_000 - 40_000 = 960_000
    //   max per-use = 960_000 / 2 = 480_000
    const result = validationService.calculateMaxAssetAmountV3(
      ASSET_TOKEN_ADDRESS,
      2,
      [assetTokenNoStandards, makeFeeToken(1_000_000n)],
    );

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe(480_000n);
  });

  it("should calculate max per-use amount for airdrop non-fee token (max_use=3)", () => {
    // Airdrop scenario: ICRC2, max_use=3, balance=1_000_000, fee=10_000
    //   networkFee = 2*10_000 + 3*10_000 = 50_000
    //   availableBalance = 1_000_000 - 50_000 = 950_000
    //   max per-use = 950_000 / 3 = 316_666 (integer division)
    const result = validationService.calculateMaxAssetAmountV3(
      ASSET_TOKEN_ADDRESS,
      3,
      [makeAssetToken(1_000_000n), makeFeeToken(1_000_000n)],
    );

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe(316_666n);
  });

  it("should calculate max per-use amount when asset token is also fee token (max_use=2)", () => {
    const feeTokenNoStandards: TokenWithPriceAndBalance = {
      ...makeFeeToken(1_000_000n),
      tokenStandards: undefined,
    };

    // fee-token, ICRC2 (defaults), max_use=2, balance=1_000_000, fee=10_000:
    //   creatorToTreasury = intent_total_amount(10_000) + intent_total_network_fee(2*10_000) = 30_000
    //   networkFee = 2*10_000 + 2*10_000 - 10_000 = 30_000  (one fee already in required fee)
    //   availableBalance = 1_000_000 - 30_000 - 30_000 = 940_000
    //   max per-use = 940_000 / 2 = 470_000
    const result = validationService.calculateMaxAssetAmountV3(
      FEE_TOKEN_ADDRESS,
      2,
      [feeTokenNoStandards],
    );

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe(470_000n);
  });

  it("should calculate max per-use amount for airdrop when asset token is also fee token (max_use=3)", () => {
    const feeTokenNoStandards: TokenWithPriceAndBalance = {
      ...makeFeeToken(2_000_000n),
      tokenStandards: undefined,
    };

    // fee-token, ICRC2 (defaults), max_use=3, balance=2_000_000, fee=10_000:
    //   creatorToTreasury = 10_000 + 2*10_000 = 30_000
    //   networkFee = 2*10_000 + 3*10_000 - 10_000 = 40_000
    //   availableBalance = 2_000_000 - 30_000 - 40_000 = 1_930_000
    //   max per-use = 1_930_000 / 3 = 643_333 (integer division)
    const result = validationService.calculateMaxAssetAmountV3(
      FEE_TOKEN_ADDRESS,
      3,
      [feeTokenNoStandards],
    );

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe(643_333n);
  });

  it("should return Ok(0n) when balance is insufficient to cover fees", () => {
    const feeTokenLowBalance: TokenWithPriceAndBalance = {
      ...makeFeeToken(50_000n),
      tokenStandards: undefined,
    };

    // fee-token, ICRC2 (defaults), max_use=2, balance=50_000:
    //   creatorToTreasury = 10_000 + 20_000 = 30_000
    //   networkFee = 2*10_000 + 2*10_000 - 10_000 = 30_000
    //   availableBalance = 50_000 - 30_000 - 30_000 = -10_000 (clamped to 0n)
    const result = validationService.calculateMaxAssetAmountV3(
      FEE_TOKEN_ADDRESS,
      2,
      [feeTokenLowBalance],
    );

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toBe(0n);
  });
});
