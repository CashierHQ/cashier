import { describe, expect, it, vi, beforeEach } from "vitest";
import { Principal } from "@dfinity/principal";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import {
  AssetAndFeeListMapper,
  type WalletAssetInput,
} from "$modules/shared/types/feeService";
import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import IntentTask from "$modules/links/types/action/intentTask";
import IntentState from "$modules/links/types/action/intentState";
import Intent from "$modules/links/types/action/intent";
import IntentType, {
  TransferData,
  type IntentPayload,
} from "$modules/links/types/action/intentType";
import Asset from "$modules/links/types/asset";
import Wallet from "$modules/links/types/wallet";
import type Action from "$modules/links/types/action/action";
import { ActionState } from "$modules/links/types/action/actionState";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { FlowDirection } from "$modules/transactionCart/types/transaction-source";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";
import { FeeType } from "$modules/links/types/fee";
import { ICP_LEDGER_FEE } from "$modules/token/constants";

// Test fixtures
const fromIdentity = Ed25519KeyIdentity.generate();
const fromWallet = new Wallet(fromIdentity.getPrincipal(), []);
const toIdentity = Ed25519KeyIdentity.generate();
const toWallet = new Wallet(toIdentity.getPrincipal(), []);
const testAsset = new Asset(Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"));

const LEDGER_FEE = 10_000n; // 0.0001 token in e8s

// Helper: Create intent payload for transfer
const createTransferPayload = (amount: bigint): IntentPayload => {
  return new TransferData(toWallet, testAsset, fromWallet, amount);
};

// Helper: Create intent with specified params
const createIntent = (
  id: string,
  task: IntentTask,
  amount: bigint,
  state: string = IntentState.CREATED,
): Intent => {
  const payload = createTransferPayload(amount);
  return new Intent(id, task, new IntentType(payload), 0n, state);
};

// Helper: Create mock token
const createMockToken = (
  address: string,
  overrides: Partial<TokenWithPriceAndBalance> = {},
): TokenWithPriceAndBalance => ({
  address,
  name: "Test Token",
  symbol: "TEST",
  decimals: 8,
  fee: LEDGER_FEE,
  enabled: true,
  is_default: false,
  balance: 100_000_000n,
  priceUSD: 10.0,
  ...overrides,
});

// Helper: Create mock action
const createMockAction = (type: ActionType, intents: Intent[]): Action => ({
  id: "action-1",
  creator: fromIdentity.getPrincipal(),
  type: type as ActionTypeValue,
  state: ActionState.CREATED,
  intents,
});

describe("AssetAndFeeListMapper", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getFlowDirection", () => {
    it("returns OUTGOING when from.address matches walletPrincipal", () => {
      const payload = createTransferPayload(100_000_000n);
      const result = AssetAndFeeListMapper.getFlowDirection(
        payload,
        fromIdentity.getPrincipal().toText(),
      );
      expect(result).toBe(FlowDirection.OUTGOING);
    });

    it("returns INCOMING when only to.address matches walletPrincipal", () => {
      const payload = createTransferPayload(100_000_000n);
      const result = AssetAndFeeListMapper.getFlowDirection(
        payload,
        toIdentity.getPrincipal().toText(),
      );
      expect(result).toBe(FlowDirection.INCOMING);
    });

    it("throws error when neither address matches walletPrincipal", () => {
      const payload = createTransferPayload(100_000_000n);
      expect(() =>
        AssetAndFeeListMapper.getFlowDirection(payload, "unrelated-principal"),
      ).toThrow("User is neither sender nor receiver");
    });

    it("returns OUTGOING for self-transfer (from=to=wallet)", () => {
      const selfPayload = new TransferData(
        fromWallet,
        testAsset,
        fromWallet,
        100_000_000n,
      );
      const result = AssetAndFeeListMapper.getFlowDirection(
        selfPayload,
        fromIdentity.getPrincipal().toText(),
      );
      expect(result).toBe(FlowDirection.OUTGOING);
    });
  });

  describe("computeAmountAndFee", () => {
    describe("CREATE_LINK action type", () => {
      it("TRANSFER_WALLET_TO_TREASURY: amount=fee=ledgerFee*2+payload.amount", () => {
        const intent = createIntent(
          "id-1",
          IntentTask.TRANSFER_WALLET_TO_TREASURY,
          100_000_000n,
        );
        const result = AssetAndFeeListMapper.computeAmountAndFee({
          intent,
          ledgerFee: LEDGER_FEE,
          actionType: ActionType.CREATE_LINK,
        });
        const expectedTotal = LEDGER_FEE * 2n + 100_000_000n;
        expect(result.amount).toBe(expectedTotal);
        expect(result.fee).toBe(expectedTotal);
      });

      it("other intents: amount=ledgerFee+payload.amount, fee=ledgerFee", () => {
        const intent = createIntent(
          "id-2",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const result = AssetAndFeeListMapper.computeAmountAndFee({
          intent,
          ledgerFee: LEDGER_FEE,
          actionType: ActionType.CREATE_LINK,
        });
        expect(result.amount).toBe(LEDGER_FEE + 100_000_000n);
        expect(result.fee).toBe(LEDGER_FEE);
      });
    });

    describe("WITHDRAW action type", () => {
      it("returns amount=payload.amount, fee=ledgerFee", () => {
        const intent = createIntent(
          "id-3",
          IntentTask.TRANSFER_LINK_TO_WALLET,
          100_000_000n,
        );
        const result = AssetAndFeeListMapper.computeAmountAndFee({
          intent,
          ledgerFee: LEDGER_FEE,
          actionType: ActionType.WITHDRAW,
        });
        expect(result.amount).toBe(100_000_000n);
        expect(result.fee).toBe(LEDGER_FEE);
      });
    });

    describe("SEND action type", () => {
      it("returns amount=payload.amount+ledgerFee, fee=ledgerFee", () => {
        const intent = createIntent(
          "id-4",
          IntentTask.TRANSFER_LINK_TO_WALLET,
          100_000_000n,
        );
        const result = AssetAndFeeListMapper.computeAmountAndFee({
          intent,
          ledgerFee: LEDGER_FEE,
          actionType: ActionType.SEND,
        });
        expect(result.amount).toBe(100_000_000n + LEDGER_FEE);
        expect(result.fee).toBe(LEDGER_FEE);
      });
    });

    describe("RECEIVE action type", () => {
      it("returns amount=payload.amount, fee=undefined", () => {
        const intent = createIntent(
          "id-5",
          IntentTask.TRANSFER_LINK_TO_WALLET,
          100_000_000n,
        );
        const result = AssetAndFeeListMapper.computeAmountAndFee({
          intent,
          ledgerFee: LEDGER_FEE,
          actionType: ActionType.RECEIVE,
        });
        expect(result.amount).toBe(100_000_000n);
        expect(result.fee).toBeUndefined();
      });
    });

    it("handles zero amount correctly", () => {
      const intent = createIntent(
        "id-7",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        0n,
      );
      const result = AssetAndFeeListMapper.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.SEND,
      });
      expect(result.amount).toBe(LEDGER_FEE);
      expect(result.fee).toBe(LEDGER_FEE);
    });

    it("handles large amounts correctly", () => {
      const largeAmount = 10_000_000_000_000_000n;
      const intent = createIntent(
        "id-8",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        largeAmount,
      );
      const result = AssetAndFeeListMapper.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.SEND,
      });
      expect(result.amount).toBe(largeAmount + LEDGER_FEE);
      expect(result.fee).toBe(LEDGER_FEE);
    });

    it("handles different ledger fees", () => {
      const customFee = 50_000n;
      const intent = createIntent(
        "id-9",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        100_000_000n,
      );
      const result = AssetAndFeeListMapper.computeAmountAndFee({
        intent,
        ledgerFee: customFee,
        actionType: ActionType.SEND,
      });
      expect(result.amount).toBe(100_000_000n + customFee);
      expect(result.fee).toBe(customFee);
    });
  });

  describe("fromAction", () => {
    const tokenAddress = testAsset.address.toString();

    describe("with token found in map", () => {
      const token = createMockToken(tokenAddress, {
        symbol: "ICP",
        decimals: 8,
        fee: LEDGER_FEE,
        priceUSD: 10.0,
      });
      const tokensMap = { [tokenAddress]: token };

      it("maps SEND action to AssetAndFeeList with correct direction", () => {
        const intent = createIntent(
          "id-1",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          tokensMap,
          fromIdentity.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.direction).toBe(FlowDirection.OUTGOING);
        expect(result[0].asset.symbol).toBe("ICP");
        expect(result[0].asset.intentId).toBe("id-1");
      });

      it("maps RECEIVE action with no fee", () => {
        const intent = createIntent(
          "id-2",
          IntentTask.TRANSFER_LINK_TO_WALLET,
          100_000_000n,
        );
        const action = createMockAction(ActionType.RECEIVE, [intent]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          tokensMap,
          toIdentity.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.direction).toBe(FlowDirection.INCOMING);
        expect(result[0].fee).toBeUndefined();
      });

      it("maps CREATE_LINK with TRANSFER_WALLET_TO_TREASURY as CREATE_LINK_FEE", () => {
        const intent = createIntent(
          "id-3",
          IntentTask.TRANSFER_WALLET_TO_TREASURY,
          100_000_000n,
        );
        const action = createMockAction(ActionType.CREATE_LINK, [intent]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          tokensMap,
          fromIdentity.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.label).toBe("Create link fee");
        expect(result[0].fee?.feeType).toBe(FeeType.CREATE_LINK_FEE);
      });

      it("maps CREATE_LINK with other task as NETWORK_FEE", () => {
        const intent = createIntent(
          "id-4",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.CREATE_LINK, [intent]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          tokensMap,
          fromIdentity.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.label).toBe("");
        expect(result[0].fee?.feeType).toBe(FeeType.NETWORK_FEE);
      });

      it("calculates USD values when priceUSD available", () => {
        const intent = createIntent(
          "id-5",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          tokensMap,
          fromIdentity.getPrincipal().toText(),
        );

        expect(result[0].asset.usdValueStr).toBeDefined();
        expect(result[0].fee?.usdValue).toBeDefined();
        expect(result[0].fee?.usdValueStr).toBeDefined();
      });

      it("handles multiple intents in one action", () => {
        const intent1 = createIntent(
          "id-6a",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          50_000_000n,
        );
        const intent2 = createIntent(
          "id-6b",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          30_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent1, intent2]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          tokensMap,
          fromIdentity.getPrincipal().toText(),
        );

        expect(result).toHaveLength(2);
        expect(result[0].asset.intentId).toBe("id-6a");
        expect(result[1].asset.intentId).toBe("id-6b");
      });

      it("maps intent state to asset process state", () => {
        const intent = createIntent(
          "id-7",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
          IntentState.SUCCESS,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          tokensMap,
          fromIdentity.getPrincipal().toText(),
        );

        expect(result[0].asset.state).toBe(AssetProcessState.SUCCEED);
      });
    });

    describe("with token not found in map", () => {
      it("falls back to N/A symbol and default decimals", () => {
        const intent = createIntent(
          "id-8",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          {},
          fromIdentity.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.symbol).toBe("N/A");
        expect(result[0].fee?.symbol).toBe("N/A");
      });

      it("uses ICP_LEDGER_FEE as fallback", () => {
        const intent = createIntent(
          "id-9",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          {},
          fromIdentity.getPrincipal().toText(),
        );

        // For SEND: amount = payload + fee = 100_000_000 + ICP_LEDGER_FEE
        expect(result[0].asset.amount).toBe(100_000_000n + ICP_LEDGER_FEE);
        expect(result[0].fee?.amount).toBe(ICP_LEDGER_FEE);
      });

      it("sets state to PROCESSING when token not found", () => {
        const intent = createIntent(
          "id-10",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          {},
          fromIdentity.getPrincipal().toText(),
        );

        expect(result[0].asset.state).toBe(AssetProcessState.PROCESSING);
      });

      it("has undefined USD values", () => {
        const intent = createIntent(
          "id-11",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          {},
          fromIdentity.getPrincipal().toText(),
        );

        expect(result[0].asset.usdValueStr).toBeUndefined();
        expect(result[0].fee?.usdValue).toBeUndefined();
      });
    });

    describe("edge cases", () => {
      const token = createMockToken(tokenAddress);
      const tokensMap = { [tokenAddress]: token };

      it("handles action with empty intents array", () => {
        const action = createMockAction(ActionType.SEND, []);

        const result = AssetAndFeeListMapper.fromAction(
          action,
          tokensMap,
          fromIdentity.getPrincipal().toText(),
        );

        expect(result).toHaveLength(0);
      });

      it("handles token without priceUSD", () => {
        const tokenNoPriceAddress = "no-price-token";
        const tokenNoPrice = createMockToken(tokenNoPriceAddress, {
          priceUSD: undefined,
        });
        const tokensMapNoPrice = { [tokenNoPriceAddress]: tokenNoPrice };

        // Create custom asset and payload for this test
        const customAsset = new Asset(Principal.fromText("aaaaa-aa"));
        const customFromWallet = new Wallet(fromIdentity.getPrincipal(), []);
        const customToWallet = new Wallet(toIdentity.getPrincipal(), []);
        const customPayload = new TransferData(
          customToWallet,
          customAsset,
          customFromWallet,
          100_000_000n,
        );
        const intent = new Intent(
          "id-12",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          new IntentType(customPayload),
          0n,
          IntentState.CREATED,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        // This won't find the token since address doesn't match
        const result = AssetAndFeeListMapper.fromAction(
          action,
          tokensMapNoPrice,
          fromIdentity.getPrincipal().toText(),
        );

        // Falls back to N/A since aaaaa-aa is not in map
        expect(result[0].asset.usdValueStr).toBeUndefined();
      });
    });
  });

  describe("fromWallet", () => {
    const tokenAddress = "test-token-address";
    const mockToken = createMockToken(tokenAddress, {
      symbol: "TKN",
      decimals: 8,
      fee: LEDGER_FEE,
      priceUSD: 5.0,
    });
    const tokensMap = { [tokenAddress]: mockToken };

    describe("with valid token", () => {
      it("returns AssetAndFee array with single entry", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        expect(result).toHaveLength(1);
      });

      it("calculates total amount as amount + fee", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        expect(result[0].asset.amount).toBe(1_000_000n + LEDGER_FEE);
      });

      it("sets state to CREATED", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        expect(result[0].asset.state).toBe(AssetProcessState.CREATED);
      });

      it("sets direction to OUTGOING", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        expect(result[0].asset.direction).toBe(FlowDirection.OUTGOING);
      });

      it("sets fee type to NETWORK_FEE", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        expect(result[0].fee?.feeType).toBe(FeeType.NETWORK_FEE);
      });

      it("uses token fee from tokens map", () => {
        const customFee = 5_000n;
        const tokenWithCustomFee = createMockToken(tokenAddress, {
          fee: customFee,
        });
        const customTokensMap = { [tokenAddress]: tokenWithCustomFee };
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, customTokensMap);

        expect(result[0].fee?.amount).toBe(customFee);
        expect(result[0].asset.amount).toBe(1_000_000n + customFee);
      });

      it("uses ICP_LEDGER_FEE when token fee is undefined", () => {
        const tokenNoFee = createMockToken(tokenAddress, { fee: undefined });
        const noFeeTokensMap = { [tokenAddress]: tokenNoFee };
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, noFeeTokensMap);

        expect(result[0].fee?.amount).toBe(ICP_LEDGER_FEE);
      });

      it("calculates USD values when priceUSD available", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        expect(result[0].asset.usdValueStr).toBeDefined();
        expect(result[0].fee?.usdValue).toBeDefined();
      });

      it("handles token without priceUSD", () => {
        const tokenNoPrice = createMockToken(tokenAddress, {
          priceUSD: undefined,
        });
        const noPriceTokensMap = { [tokenAddress]: tokenNoPrice };
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(
          input,
          noPriceTokensMap,
        );

        expect(result[0].asset.usdValueStr).toBeUndefined();
        expect(result[0].fee?.usdValue).toBeUndefined();
      });

      it("sets correct asset properties", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        const asset = result[0].asset;
        expect(asset.symbol).toBe("TKN");
        expect(asset.address).toBe(tokenAddress);
        expect(asset.label).toBe("");
        expect(asset.amountFormattedStr).toBeDefined();
      });

      it("sets correct fee properties", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        const fee = result[0].fee;
        expect(fee?.symbol).toBe("TKN");
        expect(fee?.amountFormattedStr).toBeDefined();
      });
    });

    describe("with token not found", () => {
      it("returns empty array", () => {
        const input: WalletAssetInput = {
          amount: 1_000_000n,
          tokenAddress: "unknown",
        };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        expect(result).toHaveLength(0);
      });

      it("logs error to console", () => {
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});
        const input: WalletAssetInput = {
          amount: 1_000_000n,
          tokenAddress: "unknown",
        };

        AssetAndFeeListMapper.fromWallet(input, tokensMap);

        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to resolve token for wallet transfer:",
          "unknown",
        );
        consoleSpy.mockRestore();
      });
    });

    describe("edge cases", () => {
      it("handles zero amount", () => {
        const input: WalletAssetInput = { amount: 0n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        expect(result[0].asset.amount).toBe(LEDGER_FEE); // 0 + fee
      });

      it("handles large amounts", () => {
        const largeAmount = 10_000_000_000_000_000n;
        const input: WalletAssetInput = { amount: largeAmount, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, tokensMap);

        expect(result[0].asset.amount).toBe(largeAmount + LEDGER_FEE);
      });

      it("handles different token decimals", () => {
        const sixDecimalToken = createMockToken("usdc-addr", {
          symbol: "USDC",
          decimals: 6,
          fee: 1_000n,
        });
        const sixDecimalMap = { "usdc-addr": sixDecimalToken };
        const input: WalletAssetInput = {
          amount: 1_000_000n,
          tokenAddress: "usdc-addr",
        };

        const result = AssetAndFeeListMapper.fromWallet(input, sixDecimalMap);

        expect(result[0].asset.symbol).toBe("USDC");
        expect(result[0].asset.amount).toBe(1_001_000n);
      });

      it("handles empty tokens map", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = AssetAndFeeListMapper.fromWallet(input, {});

        expect(result).toHaveLength(0);
      });
    });
  });
});
