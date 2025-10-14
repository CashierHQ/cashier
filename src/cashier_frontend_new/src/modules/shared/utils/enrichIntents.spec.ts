import { describe, expect, it, beforeEach, vi } from "vitest";
import { Principal } from "@dfinity/principal";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

// Create a hoisted mock walletStore data
const mockWalletStoreData = vi.hoisted(() => ({
  data: null as TokenWithPriceAndBalance[] | null,
}));

// Mock the walletStore module - vi.mock is hoisted so this works
vi.mock("$modules/token/state/walletStore.svelte", () => ({
  walletStore: {
    query: mockWalletStoreData,
  },
}));

import { enrichIntents } from "./enrichIntents";
import { Action } from "$modules/links/types/action/action";
import { ActionType } from "$modules/links/types/action/actionType";
import { ActionState } from "$modules/links/types/action/actionState";
import Intent from "$modules/links/types/action/intent";
import IntentTask from "$modules/links/types/action/intentTask";
import IntentType, { TransferData } from "$modules/links/types/action/intentType";
import IntentState from "$modules/links/types/action/intentState";
import { Asset } from "$modules/links/types/asset";
import { Wallet } from "$modules/links/types/wallet";

// Token address constants
const TOKEN_ADDRESSES = {
  ICP: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  ckBTC: "mxzaz-hqaaa-aaaar-qaada-cai",
  ckETH: "ss2fx-dyaaa-aaaar-qacoq-cai",
  ckUSDC: "xevnm-gaaaa-aaaar-qafnq-cai",
  MOCK_WALLET: "g65x6-eyndf-zfvsy-fejqg-lbkwt-ri3ce-qq4gi-dxppa-nkd7v-cflse-aqe",
};

// Helper functions to create test objects
function createMockWallet(): Wallet {
  return new Wallet(null, Principal.fromText(TOKEN_ADDRESSES.MOCK_WALLET));
}

function createMockAsset(address: string = TOKEN_ADDRESSES.ICP): Asset {
  return new Asset(Principal.fromText(address));
}

function createMockTransferData(amount: bigint = 100000000n, assetAddress?: string): TransferData {
  const wallet = createMockWallet();
  const asset = createMockAsset(assetAddress);
  return new TransferData(wallet, asset, wallet, amount);
}

function createMockIntentType(transferData: TransferData): IntentType {
  // Create a proper backend transfer data structure
  const mockBackendTransferData = {
    to: { IC: { address: transferData.to.address, subaccount: transferData.to.subaccount ? [transferData.to.subaccount] : [] } },
    asset: { IC: { address: transferData.asset.address } },
    from: { IC: { address: transferData.from.address, subaccount: transferData.from.subaccount ? [transferData.from.subaccount] : [] } },
    amount: transferData.amount,
  };
  
  const mockBackendType = {
    Transfer: mockBackendTransferData
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return IntentType.fromBackendType(mockBackendType as any);
}

function createMockIntent(
  task: IntentTask = IntentTask.TransferWalletToTreasury,
  amount: bigint = 100000000n,
  assetAddress?: string
): Intent {
  const transferData = createMockTransferData(amount, assetAddress);
  const intentType = createMockIntentType(transferData);
  
  return new Intent(
    "intent-1",
    task,
    intentType,
    BigInt(Date.now()),
    IntentState.Processing,
  );
}

function createMockAction(intents: Intent[] = []): Action {
  return new Action(
    "test-id",
    Principal.fromText(TOKEN_ADDRESSES.MOCK_WALLET),
    ActionType.CreateLink,
    ActionState.Processing,
    intents,
  );
}

function createMockToken(
  address: string,
  symbol: string = "ICP",
  decimals: number = 8,
  balance: bigint = 100000000n
): TokenWithPriceAndBalance {
  return {
    name: `${symbol} Token`,
    symbol,
    address,
    decimals,
    enabled: true,
    fee: 10000n,
    is_default: symbol === "ICP",
    balance,
    priceUSD: 5.0,
  };
}

describe("enrichIntents", () => {
  beforeEach(() => {
    // Reset wallet store data before each test
    mockWalletStoreData.data = null;
  });

  it("should return empty enriched intents when action has no intents", () => {
    // Arrange
    const action = createMockAction([]);

    // Act
    const result = enrichIntents(action);
    
    // Assert
    expect(result).toEqual({
      enrichedIntents: [],
    });
  });

  it("should return empty enriched intents when walletStore has no data", () => {
    // Arrange
    const intent = createMockIntent();
    const action = createMockAction([intent]);

    // Act
    const result = enrichIntents(action);
    
    // Assert
    expect(result).toEqual({
      enrichedIntents: [],
    });
  });

  it("should enrich intents with token metadata from wallet store", () => {
    // Arrange
    const tokenAddress = TOKEN_ADDRESSES.ICP;
    
    mockWalletStoreData.data = [
      createMockToken(tokenAddress, "ICP", 8, 100000000n),
    ];

    const intent = createMockIntent(IntentTask.TransferWalletToTreasury, 100000000n, tokenAddress);
    const action = createMockAction([intent]);

    // Act
    const result = enrichIntents(action);
    
    // Assert
    expect(result.enrichedIntents).toHaveLength(1);
    expect(result.enrichedIntents[0]).toEqual({
      formatedAmount: "1.00000",
      feeType: "Link creation fee",
      tokenSymbol: "ICP",
      tokenLogo: "",
    });
  });

  it("should use fallback values for unknown tokens", () => {
    // Arrange
    mockWalletStoreData.data = []; // Empty wallet, token not found

    const intent = createMockIntent(IntentTask.TransferWalletToLink, 50000000n);
    const action = createMockAction([intent]);

    // Act
    const result = enrichIntents(action);
    
    // Assert
    expect(result.enrichedIntents).toHaveLength(1);
    expect(result.enrichedIntents[0]).toEqual({
      formatedAmount: "0.50000",
      feeType: "",
      tokenSymbol: "UNKNOWN",
      tokenLogo: "",
    });
  });

  it("should format amounts correctly for different ranges", () => {
    // Arrange
    const tokenAddress = TOKEN_ADDRESSES.ckBTC;
    mockWalletStoreData.data = [
      createMockToken(tokenAddress, "TEST", 6, 1000000n),
    ];
    const smallIntent = createMockIntent(IntentTask.TransferLinkToWallet, 1000n, tokenAddress);
    const smallAction = createMockAction([smallIntent]);

    // Act
    const smallResult = enrichIntents(smallAction);
    
    // Assert 
    expect(smallResult.enrichedIntents[0].formatedAmount).toBe("0.001");
    expect(smallResult.enrichedIntents[0].feeType).toBe("");
  });

  it("should handle different intent task types correctly", () => {
    // Arrange
    const tokenAddress = TOKEN_ADDRESSES.ckETH;
    mockWalletStoreData.data = [
      createMockToken(tokenAddress, "ckETH", 18, 1000000000000000000n),
    ];
    const treasuryIntent = createMockIntent(IntentTask.TransferWalletToTreasury, 100000000n, tokenAddress);
    const linkIntent = createMockIntent(IntentTask.TransferWalletToLink, 100000000n, tokenAddress);
    const walletIntent = createMockIntent(IntentTask.TransferLinkToWallet, 100000000n, tokenAddress);
    const action = createMockAction([treasuryIntent, linkIntent, walletIntent]);

    // Act
    const result = enrichIntents(action);
    
    // Assert
    expect(result.enrichedIntents).toHaveLength(3);
    expect(result.enrichedIntents[0].feeType).toBe("Link creation fee");
    expect(result.enrichedIntents[1].feeType).toBe("");
    expect(result.enrichedIntents[2].feeType).toBe("");
  });

  it("should handle multiple intents with different tokens", () => {
    // Arrange
    mockWalletStoreData.data = [
      createMockToken(TOKEN_ADDRESSES.ICP, "ICP", 8, 100000000n),
      createMockToken(TOKEN_ADDRESSES.ckUSDC, "ckUSDC", 6, 1000000n),
    ];
    const icpIntent = createMockIntent(IntentTask.TransferWalletToTreasury, 100000000n, TOKEN_ADDRESSES.ICP);
    const usdcIntent = createMockIntent(IntentTask.TransferWalletToLink, 1000000n, TOKEN_ADDRESSES.ckUSDC);
    const action = createMockAction([icpIntent, usdcIntent]);

    // Act
    const result = enrichIntents(action);
    
    // Assert
    expect(result.enrichedIntents).toHaveLength(2);
    expect(result.enrichedIntents[0]).toEqual({
      formatedAmount: "1.00000",
      feeType: "Link creation fee",
      tokenSymbol: "ICP",
      tokenLogo: "",
    });
    expect(result.enrichedIntents[1]).toEqual({
      formatedAmount: "1.00000",
      feeType: "",
      tokenSymbol: "ckUSDC",
      tokenLogo: "",
    });
  });

  it("should handle zero amounts", () => {
    // Arrange
    const tokenAddress = TOKEN_ADDRESSES.ICP;
    mockWalletStoreData.data = [
      createMockToken(tokenAddress, "ICP", 8, 100000000n),
    ];
    const intent = createMockIntent(IntentTask.TransferWalletToTreasury, 0n, tokenAddress);
    const action = createMockAction([intent]);

    // Act
    const result = enrichIntents(action);
    
    // Assert
    expect(result.enrichedIntents).toHaveLength(1);
    expect(result.enrichedIntents[0].formatedAmount).toBe("0");
  });

  it("should handle very small amounts with proper formatting", () => {
    // Arrange
    const tokenAddress = TOKEN_ADDRESSES.ckETH;
    mockWalletStoreData.data = [
      createMockToken(tokenAddress, "TEST", 18, 1000000000000000000n),
    ];
    const intent = createMockIntent(IntentTask.TransferWalletToLink, 1n, tokenAddress);
    const action = createMockAction([intent]);

    // Act
    const result = enrichIntents(action);
    
    // Assert
    expect(result.enrichedIntents).toHaveLength(1);
    expect(result.enrichedIntents[0].formatedAmount).toBe("0");
  });

  it("should handle large amounts correctly", () => {
    // Arrange
    const tokenAddress = TOKEN_ADDRESSES.ICP;
    mockWalletStoreData.data = [
      createMockToken(tokenAddress, "ICP", 8, 100000000n),
    ];
    const intent = createMockIntent(IntentTask.TransferWalletToTreasury, 1000000000000n, tokenAddress); // 10,000 ICP
    const action = createMockAction([intent]);

    // Act
    const result = enrichIntents(action);
    
    // Assert
    expect(result.enrichedIntents).toHaveLength(1);
    expect(result.enrichedIntents[0].formatedAmount).toBe("10000.00000");
  });
});