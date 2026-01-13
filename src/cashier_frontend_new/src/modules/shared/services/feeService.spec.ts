import {
  ActionType,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import { ActionState } from "$modules/links/types/action/actionState";
import Intent from "$modules/links/types/action/intent";
import IntentState from "$modules/links/types/action/intentState";
import IntentTask from "$modules/links/types/action/intentTask";
import IntentType, {
  TransferData,
  type IntentPayload,
} from "$modules/links/types/action/intentType";
import Asset from "$modules/links/types/asset";
import Wallet from "$modules/links/types/wallet";
import type Action from "$modules/links/types/action/action";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { ICP_LEDGER_FEE } from "$modules/token/constants";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { Principal } from "@dfinity/principal";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { feeService, FeeService } from "./feeService";
import { FlowDirection } from "$modules/transactionCart/types/transaction-source";
import { FeeType } from "$modules/links/types/fee";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";
import type {
  AssetAndFeeList,
  WalletAssetInput,
} from "$modules/shared/types/feeService";

const from = Ed25519KeyIdentity.generate();
const fromWallet = new Wallet(from.getPrincipal(), []);
const to = Ed25519KeyIdentity.generate();
const toWallet = new Wallet(to.getPrincipal(), []);
const assets: Asset[] = [
  new Asset(Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai")),
];

// TransferData constructor: (to, asset, from, amount)
const getPayloadTransfer = (amount: bigint): IntentPayload => {
  return new TransferData(toWallet, assets[0], fromWallet, amount);
};
const createIntentWithPayload = (
  id: string,
  task: IntentTask,
  amount: bigint,
): Intent => {
  const payload = getPayloadTransfer(amount);
  return new Intent(id, task, new IntentType(payload), 0n, IntentState.CREATED);
};

const LEDGER_FEE = 10_000n; // 0.0001 token in e8s

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
  creator: from.getPrincipal(),
  type: type as ActionTypeValue,
  state: ActionState.CREATED,
  intents,
});

describe("FeeService", () => {
  let svc: FeeService;

  beforeEach(() => {
    svc = new FeeService();
    vi.resetAllMocks();
  });

  describe("computeAmount", () => {
    describe("CREATE_LINK action type", () => {
      it("TRANSFER_WALLET_TO_TREASURY: amount=fee=ledgerFee*2+payload.amount", () => {
        const intent = createIntentWithPayload(
          "id-1",
          IntentTask.TRANSFER_WALLET_TO_TREASURY,
          100_000_000n,
        );

        const res = svc.computeAmount({
          intent,
          ledgerFee: LEDGER_FEE,
          actionType: ActionType.CREATE_LINK,
        });

        const expectedTotal = LEDGER_FEE * 2n + 100_000_000n;
        expect(res.amount).toBe(expectedTotal);
        expect(res.fee).toBe(expectedTotal);
      });

      it("other intents: amount=ledgerFee+payload.amount, fee=ledgerFee", () => {
        const intent = createIntentWithPayload(
          "id-2",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );

        const res = svc.computeAmount({
          intent,
          ledgerFee: LEDGER_FEE,
          actionType: ActionType.CREATE_LINK,
        });

        expect(res.amount).toBe(LEDGER_FEE + 100_000_000n);
        expect(res.fee).toBe(LEDGER_FEE);
      });
    });

    describe("WITHDRAW action type", () => {
      it("returns amount=payload.amount, fee=ledgerFee", () => {
        const intent = createIntentWithPayload(
          "id-3",
          IntentTask.TRANSFER_LINK_TO_WALLET,
          100_000_000n,
        );
        const res = svc.computeAmount({
          intent,
          ledgerFee: LEDGER_FEE,
          actionType: ActionType.WITHDRAW,
        });

        expect(res.amount).toBe(100_000_000n);
        expect(res.fee).toBe(LEDGER_FEE);
      });
    });

    describe("SEND action type", () => {
      it("returns amount=payload.amount+ledgerFee, fee=ledgerFee", () => {
        const intent = createIntentWithPayload(
          "id-4",
          IntentTask.TRANSFER_LINK_TO_WALLET,
          100_000_000n,
        );
        const res = svc.computeAmount({
          intent,
          ledgerFee: LEDGER_FEE,
          actionType: ActionType.SEND,
        });

        expect(res.amount).toBe(100_000_000n + LEDGER_FEE);
        expect(res.fee).toBe(LEDGER_FEE);
      });
    });

    describe("RECEIVE action type", () => {
      it("returns amount=payload.amount, fee=undefined", () => {
        const intent = createIntentWithPayload(
          "id-5",
          IntentTask.TRANSFER_LINK_TO_WALLET,
          100_000_000n,
        );
        const res = svc.computeAmount({
          intent,
          ledgerFee: LEDGER_FEE,
          actionType: ActionType.RECEIVE,
        });

        expect(res.amount).toBe(100_000_000n);
        expect(res.fee).toBeUndefined();
      });
    });

    it("handles zero amount correctly", () => {
      const intent = createIntentWithPayload(
        "id-7",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        0n,
      );
      const result = svc.computeAmount({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.SEND,
      });
      expect(result.amount).toBe(LEDGER_FEE);
      expect(result.fee).toBe(LEDGER_FEE);
    });

    it("handles large amounts correctly", () => {
      const largeAmount = 10_000_000_000_000_000n;
      const intent = createIntentWithPayload(
        "id-8",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        largeAmount,
      );
      const result = svc.computeAmount({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.SEND,
      });
      expect(result.amount).toBe(largeAmount + LEDGER_FEE);
      expect(result.fee).toBe(LEDGER_FEE);
    });

    it("handles different ledger fees", () => {
      const customFee = 50_000n;
      const intent = createIntentWithPayload(
        "id-9",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        100_000_000n,
      );
      const result = svc.computeAmount({
        intent,
        ledgerFee: customFee,
        actionType: ActionType.SEND,
      });
      expect(result.amount).toBe(100_000_000n + customFee);
      expect(result.fee).toBe(customFee);
    });
  });

  describe("getLinkCreationFee", () => {
    it("should return link creation fee information", () => {
      const feeInfo = svc.getLinkCreationFee();

      expect(feeInfo).toBeDefined();
      expect(feeInfo.amount).toBe(10_000n); // 0.0001 ICP in e8s
      expect(feeInfo.tokenAddress).toBeDefined();
      expect(feeInfo.symbol).toBe("ICP");
      expect(feeInfo.decimals).toBe(8);
    });

    it("should return consistent fee information on multiple calls", () => {
      const feeInfo1 = svc.getLinkCreationFee();
      const feeInfo2 = svc.getLinkCreationFee();

      expect(feeInfo1).toEqual(feeInfo2);
    });
  });

  describe("forecastLinkCreationFees", () => {
    const LEDGER_FEE = 10_000n; // 0.0001 token in e8s
    it("should returns asset item and link creation fee when token found", () => {
      const token = {
        address: assets[0].address.toString(),
        decimals: 8,
        fee: LEDGER_FEE,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const tokensMap = { [token.address]: token };
      const useAmount = 100_000_000n;

      const pairs = svc.forecastLinkCreationFees(
        [{ address: token.address, useAmount }],
        1,
        tokensMap,
      );

      // Should include one asset + 1 link creation fee
      expect(pairs).toHaveLength(2);

      const assetPair = pairs[0];
      expect(assetPair.asset.symbol).toBe("ICP");

      const expectedTotal = parseBalanceUnits(
        useAmount + LEDGER_FEE + LEDGER_FEE,
        token.decimals,
      );
      expect(assetPair.asset.amount).toBe(formatNumber(expectedTotal));

      const linkFee = pairs.find((p) => p.asset.label === "Create link fee");
      expect(linkFee).toBeDefined();
      if (linkFee) {
        expect(linkFee.asset.amount).toBe(
          formatNumber(parseBalanceUnits(30_000n, token.decimals)),
        );
        expect(linkFee.asset.symbol).toBe("ICP");
      }
    });

    it("should calcualte with maxUse more than two", () => {
      const token = {
        address: assets[0].address.toString(),
        decimals: 8,
        fee: LEDGER_FEE,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const tokensMap = { [token.address]: token };
      const useAmount = 100_000_000n;
      const maxUse = 5;

      const pairs = svc.forecastLinkCreationFees(
        [{ address: token.address, useAmount }],
        maxUse,
        tokensMap,
      );

      const assetPair = pairs[0];
      expect(assetPair.asset.symbol).toBe("ICP");

      // Formula: (useAmount + ledgerFee) * maxUse + ledgerFee
      const expectedTotal = parseBalanceUnits(
        (useAmount + LEDGER_FEE) * BigInt(maxUse) + LEDGER_FEE,
        token.decimals,
      );
      expect(assetPair.asset.amount).toBe(formatNumber(expectedTotal));

      const linkFee = pairs.find((p) => p.asset.label === "Create link fee");
      expect(linkFee).toBeDefined();
      if (linkFee) {
        expect(linkFee.asset.amount).toBe(
          formatNumber(parseBalanceUnits(30_000n, token.decimals)),
        );
        expect(linkFee.asset.symbol).toBe("ICP");
      }
    });

    it("handles three tokens with different decimals and ledger fees", () => {
      const tokenA = {
        address: "token-a",
        decimals: 8,
        fee: 10_000n,
        symbol: "TKNA",
        priceUSD: 1.0,
      } as unknown as TokenWithPriceAndBalance;

      const tokenB = {
        address: "token-b",
        decimals: 6,
        fee: 20_000n,
        symbol: "TKNB",
        priceUSD: 2.0,
      } as unknown as TokenWithPriceAndBalance;

      const tokenC = {
        address: "token-c",
        decimals: 2,
        fee: 300n,
        symbol: "TKNC",
        priceUSD: 0.5,
      } as unknown as TokenWithPriceAndBalance;

      const tokensMap = {
        [tokenA.address]: tokenA,
        [tokenB.address]: tokenB,
        [tokenC.address]: tokenC,
      } as Record<string, TokenWithPriceAndBalance>;

      const useA = 1_000_000_00n; // 100_000_000
      const useB = 2_000_000_00n; // 200_000_000
      const useC = 3_000n;
      const maxUse = 2; // test non-trivial maxUse

      const pairs = svc.forecastLinkCreationFees(
        [
          { address: tokenA.address, useAmount: useA },
          { address: tokenB.address, useAmount: useB },
          { address: tokenC.address, useAmount: useC },
        ],
        maxUse,
        tokensMap,
      );

      // At least one returned pair per provided token
      expect(pairs.length).toBeGreaterThanOrEqual(3);

      const a = pairs.find((p) => p.asset.symbol === "TKNA");
      const b = pairs.find((p) => p.asset.symbol === "TKNB");
      const c = pairs.find((p) => p.asset.symbol === "TKNC");

      expect(a).toBeDefined();
      expect(b).toBeDefined();
      expect(c).toBeDefined();

      // Expected formula per asset: (useAmount + ledgerFee) * maxUse + ledgerFee
      if (a) {
        const expectedA = formatNumber(
          parseBalanceUnits(
            (useA + tokenA.fee) * BigInt(maxUse) + tokenA.fee,
            tokenA.decimals,
          ),
        );
        expect(a.asset.amount).toBe(expectedA);
        expect(a.fee).toBeDefined();
        if (a.fee) {
          expect(a.fee.symbol).toBe("TKNA");
          expect(typeof a.fee.amountFormattedStr).toBe("string");
        }
      }

      if (b) {
        const expectedB = formatNumber(
          parseBalanceUnits(
            (useB + tokenB.fee) * BigInt(maxUse) + tokenB.fee,
            tokenB.decimals,
          ),
        );
        expect(b.asset.amount).toBe(expectedB);
        expect(b.fee).toBeDefined();
        if (b.fee) {
          expect(b.fee.symbol).toBe("TKNB");
          expect(typeof b.fee.amountFormattedStr).toBe("string");
        }
      }

      if (c) {
        const expectedC = formatNumber(
          parseBalanceUnits(
            (useC + tokenC.fee) * BigInt(maxUse) + tokenC.fee,
            tokenC.decimals,
          ),
        );
        expect(c.asset.amount).toBe(expectedC);
        expect(c.fee).toBeDefined();
        if (c.fee) {
          expect(c.fee.symbol).toBe("TKNC");
          expect(typeof c.fee.amountFormattedStr).toBe("string");
        }
      }
    });

    it("should falls back to ICP values when token missing and does not add link fee if ICP token not present", () => {
      const unknownAddress = "unknown-token-address";
      const pairs = svc.forecastLinkCreationFees(
        [{ address: unknownAddress, useAmount: 100_000_000n }],
        1,
        {},
      );

      // No ICP token in tokens map -> only the single asset (fallback) should be present
      expect(pairs).toHaveLength(1);

      const p = pairs[0];
      expect(p.asset.symbol).toBe("N/A");

      // Formula: (useAmount + ledgerFee) * maxUse + ledgerFee
      // maxUse=1: (100_000_000n + 10_000n) * 1 + 10_000n = 100_020_000n
      const expectedTotal = parseBalanceUnits(
        (100_000_000n + 10_000n) * 1n + 10_000n,
        8,
      );
      expect(p.asset.amount).toBe(expectedTotal.toString());
      expect(p.fee).toBeDefined();
      if (p.fee) {
        expect(p.fee.amountFormattedStr).toBe(
          parseBalanceUnits(10_000n, 8).toString(),
        );
        expect(p.fee.symbol).toBe("N/A");
      }
    });

    it("should returns only link creation fee when assets list is empty and ICP token present", () => {
      const token = {
        address: assets[0].address.toString(),
        decimals: 8,
        fee: 10_000n,
        symbol: "ICP",
        priceUSD: 2.5,
      };

      const tokensMap = { [token.address]: token } as Record<
        string,
        TokenWithPriceAndBalance
      >;

      const pairs = svc.forecastLinkCreationFees([], 1, tokensMap);

      expect(pairs).toHaveLength(1);
      const p = pairs[0];
      expect(p.asset.label).toBe("Create link fee");
      expect(p.asset.symbol).toBe("ICP");
      expect(p.fee).toBeDefined();
      if (p.fee) {
        expect(p.fee.amountFormattedStr).toBe(
          formatNumber(parseBalanceUnits(30_000n, token.decimals)),
        );
      }
    });
  });

  describe("computeWalletFee", () => {
    it("should return amount+fee and fee structure", () => {
      const amount = 100_000_000n; // 1 ICP
      const tokenFee = 10_000n;

      const result = svc.computeWalletFee(amount, tokenFee);

      expect(result.amount).toBe(100_010_000n); // amount + fee
      expect(result.fee).toBe(10_000n);
    });

    it("should use ICP_LEDGER_FEE when tokenFee is undefined", () => {
      const amount = 50_000_000n;
      const tokenFee = undefined;
      const ICP_LEDGER_FEE = 10_000n;

      const result = svc.computeWalletFee(amount, tokenFee);

      expect(result.fee).toBe(ICP_LEDGER_FEE);
      expect(result.amount).toBe(amount + ICP_LEDGER_FEE);
    });

    it("should handle zero amount correctly", () => {
      const result = svc.computeWalletFee(0n, 10_000n);

      expect(result.amount).toBe(10_000n);
      expect(result.fee).toBe(10_000n);
    });

    it("should handle large amounts", () => {
      const largeAmount = 10_000_000_000_000_000n; // 100M ICP
      const fee = 10_000n;

      const result = svc.computeWalletFee(largeAmount, fee);

      expect(result.amount).toBe(largeAmount + fee);
      expect(result.fee).toBe(fee);
    });

    it("should handle different token fees correctly", () => {
      const amount = 1_000_000n;
      const differentFee = 50_000n;

      const result = svc.computeWalletFee(amount, differentFee);

      expect(result.amount).toBe(1_050_000n);
      expect(result.fee).toBe(50_000n);
    });
  });

  describe("getTotalFeeUsd", () => {
    it("should sum fee.usdValue from all assets", () => {
      const assets: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PROCESSING,
            label: "",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 1_010_000n,
            amountFormattedStr: "0.0101",
            usdValueStr: "$0.10",
            direction: FlowDirection.OUTGOING,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: 10_000n,
            amountFormattedStr: "0.0001",
            symbol: "ICP",
            usdValue: 0.001,
          },
        },
        {
          asset: {
            state: AssetProcessState.PROCESSING,
            label: "Create link fee",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 30_000n,
            amountFormattedStr: "0.0003",
            usdValueStr: "$0.003",
            direction: FlowDirection.OUTGOING,
          },
          fee: {
            feeType: FeeType.CREATE_LINK_FEE,
            amount: 30_000n,
            amountFormattedStr: "0.0003",
            symbol: "ICP",
            usdValue: 0.003,
          },
        },
      ];

      expect(feeService.getTotalFeeUsd(assets)).toBe(0.004);
    });

    it("should return 0 when no fees", () => {
      const assets: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PROCESSING,
            label: "",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 1_000_000n,
            amountFormattedStr: "0.01",
            usdValueStr: "$0.10",
            direction: FlowDirection.OUTGOING,
          },
          // No fee
        },
      ];

      expect(feeService.getTotalFeeUsd(assets)).toBe(0);
    });

    it("should return 0 for empty array", () => {
      expect(feeService.getTotalFeeUsd([])).toBe(0);
    });

    it("should handle undefined usdValue gracefully", () => {
      const assets: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PROCESSING,
            label: "",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 1_010_000n,
            amountFormattedStr: "0.0101",
            usdValueStr: "$0.10",
            direction: FlowDirection.OUTGOING,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: 10_000n,
            amountFormattedStr: "0.0001",
            symbol: "ICP",
            // usdValue intentionally undefined
          },
        },
      ];

      expect(feeService.getTotalFeeUsd(assets)).toBe(0);
    });
  });

  describe("getFlowDirection", () => {
    it("returns OUTGOING when from.address matches walletPrincipal", () => {
      const payload = getPayloadTransfer(100_000_000n);
      const result = svc.getFlowDirection(
        payload,
        from.getPrincipal().toText(),
      );
      expect(result).toBe(FlowDirection.OUTGOING);
    });

    it("returns INCOMING when only to.address matches walletPrincipal", () => {
      const payload = getPayloadTransfer(100_000_000n);
      const result = svc.getFlowDirection(payload, to.getPrincipal().toText());
      expect(result).toBe(FlowDirection.INCOMING);
    });

    it("throws error when neither address matches walletPrincipal", () => {
      const payload = getPayloadTransfer(100_000_000n);
      expect(() =>
        svc.getFlowDirection(payload, "unrelated-principal"),
      ).toThrow("User is neither sender nor receiver");
    });

    it("returns OUTGOING for self-transfer (from=to=wallet)", () => {
      const selfPayload = new TransferData(
        fromWallet,
        assets[0],
        fromWallet,
        100_000_000n,
      );
      const result = svc.getFlowDirection(
        selfPayload,
        from.getPrincipal().toText(),
      );
      expect(result).toBe(FlowDirection.OUTGOING);
    });
  });

  describe("buildFromAction", () => {
    const tokenAddress = assets[0].address.toString();

    describe("with token found in map", () => {
      const token = createMockToken(tokenAddress, {
        symbol: "ICP",
        decimals: 8,
        fee: LEDGER_FEE,
        priceUSD: 10.0,
      });
      const tokensMap = { [tokenAddress]: token };

      it("maps SEND action to AssetAndFeeList with correct direction", () => {
        const intent = createIntentWithPayload(
          "id-1",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = svc.buildFromAction(
          action,
          tokensMap,
          from.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.direction).toBe(FlowDirection.OUTGOING);
        expect(result[0].asset.symbol).toBe("ICP");
        expect(result[0].asset.intentId).toBe("id-1");
      });

      it("maps RECEIVE action with no fee", () => {
        const intent = createIntentWithPayload(
          "id-2",
          IntentTask.TRANSFER_LINK_TO_WALLET,
          100_000_000n,
        );
        const action = createMockAction(ActionType.RECEIVE, [intent]);

        const result = svc.buildFromAction(
          action,
          tokensMap,
          to.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.direction).toBe(FlowDirection.INCOMING);
        expect(result[0].fee).toBeUndefined();
      });

      it("maps CREATE_LINK with TRANSFER_WALLET_TO_TREASURY as CREATE_LINK_FEE", () => {
        const intent = createIntentWithPayload(
          "id-3",
          IntentTask.TRANSFER_WALLET_TO_TREASURY,
          100_000_000n,
        );
        const action = createMockAction(ActionType.CREATE_LINK, [intent]);

        const result = svc.buildFromAction(
          action,
          tokensMap,
          from.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.label).toBe("Create link fee");
        expect(result[0].fee?.feeType).toBe(FeeType.CREATE_LINK_FEE);
      });

      it("maps CREATE_LINK with other task as NETWORK_FEE", () => {
        const intent = createIntentWithPayload(
          "id-4",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.CREATE_LINK, [intent]);

        const result = svc.buildFromAction(
          action,
          tokensMap,
          from.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.label).toBe("");
        expect(result[0].fee?.feeType).toBe(FeeType.NETWORK_FEE);
      });

      it("calculates USD values when priceUSD available", () => {
        const intent = createIntentWithPayload(
          "id-5",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = svc.buildFromAction(
          action,
          tokensMap,
          from.getPrincipal().toText(),
        );

        expect(result[0].asset.usdValueStr).toBeDefined();
        expect(result[0].fee?.usdValue).toBeDefined();
        expect(result[0].fee?.usdValueStr).toBeDefined();
      });

      it("handles multiple intents in one action", () => {
        const intent1 = createIntentWithPayload(
          "id-6a",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          50_000_000n,
        );
        const intent2 = createIntentWithPayload(
          "id-6b",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          30_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent1, intent2]);

        const result = svc.buildFromAction(
          action,
          tokensMap,
          from.getPrincipal().toText(),
        );

        expect(result).toHaveLength(2);
        expect(result[0].asset.intentId).toBe("id-6a");
        expect(result[1].asset.intentId).toBe("id-6b");
      });
    });

    describe("with token not found in map", () => {
      it("falls back to N/A symbol and default decimals", () => {
        const intent = createIntentWithPayload(
          "id-8",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = svc.buildFromAction(
          action,
          {},
          from.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.symbol).toBe("N/A");
        expect(result[0].fee?.symbol).toBe("N/A");
      });

      it("uses ICP_LEDGER_FEE as fallback", () => {
        const intent = createIntentWithPayload(
          "id-9",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        const result = svc.buildFromAction(
          action,
          {},
          from.getPrincipal().toText(),
        );

        // For SEND: amount = payload + fee = 100_000_000 + ICP_LEDGER_FEE
        expect(result[0].asset.amount).toBe(100_000_000n + ICP_LEDGER_FEE);
        expect(result[0].fee?.amount).toBe(ICP_LEDGER_FEE);
      });
    });

    describe("edge cases", () => {
      const token = createMockToken(tokenAddress);
      const tokensMap = { [tokenAddress]: token };

      it("handles action with empty intents array", () => {
        const action = createMockAction(ActionType.SEND, []);

        const result = svc.buildFromAction(
          action,
          tokensMap,
          from.getPrincipal().toText(),
        );

        expect(result).toHaveLength(0);
      });
    });
  });

  describe("buildFromWallet", () => {
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

        const result = svc.buildFromWallet(input, tokensMap);

        expect(result).toHaveLength(1);
      });

      it("calculates total amount as amount + fee", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, tokensMap);

        expect(result[0].asset.amount).toBe(1_000_000n + LEDGER_FEE);
      });

      it("sets state to CREATED", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, tokensMap);

        expect(result[0].asset.state).toBe(AssetProcessState.CREATED);
      });

      it("sets direction to OUTGOING", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, tokensMap);

        expect(result[0].asset.direction).toBe(FlowDirection.OUTGOING);
      });

      it("sets fee type to NETWORK_FEE", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, tokensMap);

        expect(result[0].fee?.feeType).toBe(FeeType.NETWORK_FEE);
      });

      it("uses token fee from tokens map", () => {
        const customFee = 5_000n;
        const tokenWithCustomFee = createMockToken(tokenAddress, {
          fee: customFee,
        });
        const customTokensMap = { [tokenAddress]: tokenWithCustomFee };
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, customTokensMap);

        expect(result[0].fee?.amount).toBe(customFee);
        expect(result[0].asset.amount).toBe(1_000_000n + customFee);
      });

      it("uses ICP_LEDGER_FEE when token fee is undefined", () => {
        const tokenNoFee = createMockToken(tokenAddress, { fee: undefined });
        const noFeeTokensMap = { [tokenAddress]: tokenNoFee };
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, noFeeTokensMap);

        expect(result[0].fee?.amount).toBe(ICP_LEDGER_FEE);
      });

      it("calculates USD values when priceUSD available", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, tokensMap);

        expect(result[0].asset.usdValueStr).toBeDefined();
        expect(result[0].fee?.usdValue).toBeDefined();
      });

      it("handles token without priceUSD", () => {
        const tokenNoPrice = createMockToken(tokenAddress, {
          priceUSD: undefined,
        });
        const noPriceTokensMap = { [tokenAddress]: tokenNoPrice };
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, noPriceTokensMap);

        expect(result[0].asset.usdValueStr).toBeUndefined();
        expect(result[0].fee?.usdValue).toBeUndefined();
      });

      it("sets correct asset properties", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, tokensMap);

        const asset = result[0].asset;
        expect(asset.symbol).toBe("TKN");
        expect(asset.address).toBe(tokenAddress);
        expect(asset.label).toBe("");
        expect(asset.amountFormattedStr).toBeDefined();
      });

      it("sets correct fee properties", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, tokensMap);

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

        const result = svc.buildFromWallet(input, tokensMap);

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

        svc.buildFromWallet(input, tokensMap);

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

        const result = svc.buildFromWallet(input, tokensMap);

        expect(result[0].asset.amount).toBe(LEDGER_FEE); // 0 + fee
      });

      it("handles large amounts", () => {
        const largeAmount = 10_000_000_000_000_000n;
        const input: WalletAssetInput = { amount: largeAmount, tokenAddress };

        const result = svc.buildFromWallet(input, tokensMap);

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

        const result = svc.buildFromWallet(input, sixDecimalMap);

        expect(result[0].asset.symbol).toBe("USDC");
        expect(result[0].asset.amount).toBe(1_001_000n);
      });

      it("handles empty tokens map", () => {
        const input: WalletAssetInput = { amount: 1_000_000n, tokenAddress };

        const result = svc.buildFromWallet(input, {});

        expect(result).toHaveLength(0);
      });
    });
  });
});
