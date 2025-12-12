import Action from "$modules/links/types/action/action";
import { ActionState } from "$modules/links/types/action/actionState";
import { ActionType } from "$modules/links/types/action/actionType";
import Intent from "$modules/links/types/action/intent";
import IntentState from "$modules/links/types/action/intentState";
import IntentTask from "$modules/links/types/action/intentTask";
import IntentType, {
  TransferData,
  type IntentPayload,
} from "$modules/links/types/action/intentType";
import Asset from "$modules/links/types/asset";
import Wallet from "$modules/links/types/wallet";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { Principal } from "@dfinity/principal";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FeeService,
  type AssetAndFee,
  type AssetAndFeeList,
} from "./feeService";
import { FeeType } from "$modules/links/types/fee";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";

const from = Ed25519KeyIdentity.generate();
const fromWallet = new Wallet(from.getPrincipal(), []);
const to = Ed25519KeyIdentity.generate();
const toWallet = new Wallet(to.getPrincipal(), []);
const assets: Asset[] = [
  new Asset(Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai")),
];

const getPayloadTransfer = (amount: bigint): IntentPayload => {
  return new TransferData(fromWallet, assets[0], toWallet, amount);
};
const createIntentWithPayload = (
  id: string,
  task: IntentTask,
  amount: bigint,
): Intent => {
  const payload = getPayloadTransfer(amount);
  return new Intent(id, task, new IntentType(payload), 0n, IntentState.CREATED);
};

const LEDGER_FEE = 1_0000n; // 0.0001 token in e8s

describe("FeeService", () => {
  let svc: FeeService;

  beforeEach(() => {
    svc = new FeeService();
    vi.resetAllMocks();
  });

  describe("computeAmountAndFeeRaw", () => {
    it("CreateLink + TransferWalletToTreasury -> amount and fee are ledgerFee*2 + payload.amount", () => {
      const intent = createIntentWithPayload(
        "id-1",
        IntentTask.TRANSFER_WALLET_TO_TREASURY,
        100_000_000n,
      );

      const res = svc.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.CREATE_LINK,
      });

      // amount and fee are ledgerFee*2 + payload.amount
      expect(res.amount).toBe(LEDGER_FEE * 2n + 100_000_000n);
      expect(res.fee).toBe(LEDGER_FEE * 2n + 100_000_000n);
    });

    it("CreateLink + other intent -> amount = ledgerFee + payload.amount, fee = ledgerFee", () => {
      // use a different valid IntentTask (not TransferWalletToTreasury)
      const intent = createIntentWithPayload(
        "id-2",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        100_000_000n,
      );

      const res = svc.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.CREATE_LINK,
      });

      // amount = ledgerFee + payload.amount, fee = ledgerFee
      expect(res.amount).toBe(LEDGER_FEE + 100_000_000n);
      expect(res.fee).toBe(LEDGER_FEE);
    });

    it("Withdraw -> amount = payload.amount, fee = ledgerFee", () => {
      const intent = createIntentWithPayload(
        "id-3",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        100_000_000n,
      );
      const res = svc.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.WITHDRAW,
      });

      // amount = payload.amount - ledgerFee, fee = ledgerFee
      expect(res.amount).toBe(100_000_000n);
      expect(res.fee).toBe(LEDGER_FEE);
    });

    it("Send -> amount = payload.amount + ledgerFee, fee = ledgerFee", () => {
      const intent = createIntentWithPayload(
        "id-4",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        100_000_000n,
      );
      const res = svc.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.SEND,
      });

      // amount = payload.amount + ledgerFee, fee = ledgerFee
      expect(res.amount).toBe(100_000_000n + LEDGER_FEE);
      expect(res.fee).toBe(LEDGER_FEE);
    });

    it("Receive -> amount = payload.amount, fee = undefined", () => {
      const intent = createIntentWithPayload(
        "id-5",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        100_000_000n,
      );
      const res = svc.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.RECEIVE,
      });

      expect(res.amount).toBe(100_000_000n);
      expect(res.fee).toBeUndefined();
    });
  });

  describe("mapActionToAssetAndFeeList", () => {
    it("falls back to ICP values when token not found and uses 'N/A' symbols", () => {
      const svcWithMock = new FeeService();

      const action: Action = {
        type: ActionType.SEND,
        intents: [
          createIntentWithPayload(
            "id-6",
            IntentTask.TRANSFER_WALLET_TO_LINK,
            100_000_000n,
          ),
        ],
        id: "action-id-1",
        creator: Ed25519KeyIdentity.generate().getPrincipal(),
        state: ActionState.CREATED,
      };

      const pairs = svcWithMock.mapActionToAssetAndFeeList(action, {});
      expect(pairs).toHaveLength(1);
      const [p] = pairs;

      expect(p.asset.symbol).toBe("N/A");
      if (p.fee) {
        expect(p.fee.symbol).toBe("N/A");
        expect(typeof p.fee.amount).toBe("string");
      }
    });

    it("uses token values when token is found", () => {
      // token with decimals=0 so parseBalanceUnits leaves values unchanged
      const token = {
        address: assets[0].address.toString(),
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: 3.01, // price as requested
      };

      const svcWithMock2 = new FeeService();

      const action = {
        type: ActionType.SEND,
        intents: [
          createIntentWithPayload(
            "id-7",
            IntentTask.TRANSFER_WALLET_TO_LINK,
            100_000_000n,
          ),
        ],
      } as unknown as Action;

      const tokensMap = { [token.address]: token } as unknown as Record<
        string,
        TokenWithPriceAndBalance
      >;
      const pairs = svcWithMock2.mapActionToAssetAndFeeList(action, tokensMap);
      expect(pairs).toHaveLength(1);
      const [p] = pairs;

      // asset symbol comes from token
      expect(p.asset.symbol).toBe("ICP");

      // amount should be a formatted string, and for our simple values should equal formatNumber(12)
      // compute expected: payload 10 + token.fee 2 -> amount 12
      const expectedAmountStr = formatNumber(1.0001);
      expect(p.asset.amount).toBe(expectedAmountStr);

      // fee should exist and be formatted from token fee
      expect(p.fee).toBeDefined();
      if (p.fee) {
        expect(p.fee.symbol).toBe("ICP");
        expect(p.fee.amount).toBe(formatNumber(0.0001));
        // price should be propagated
        expect(p.fee.price).toBe(3.01);
        // usdValue should be 0.0001 * 3.01 =
        expect(p.fee.usdValue).toBeCloseTo(0.000301);
      }
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

  describe("convertAssetAndFeeListToFeesBreakdown", () => {
    it("should convert AssetAndFeeList to FeeBreakdownItem[] correctly", () => {
      const tokenAddress = assets[0].address.toString();
      const token: TokenWithPriceAndBalance = {
        address: tokenAddress,
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const assetAndFeeList: AssetAndFee[] = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(1.0001),
            usdValueStr: formatNumber(3.010301),
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(0.0001),
            symbol: "ICP",
            price: 3.01,
            usdValue: 0.000301,
            usdValueStr: formatNumber(0.000301),
          },
        },
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "Create link fee",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(0.0002),
            usdValueStr: formatNumber(0.000602),
          },
          fee: {
            feeType: FeeType.CREATE_LINK_FEE,
            amount: formatNumber(0.0002),
            symbol: "ICP",
            price: 3.01,
            usdValue: 0.000602,
            usdValueStr: formatNumber(0.000602),
          },
        },
      ];

      const tokensMap: Record<string, TokenWithPriceAndBalance> = {
        [tokenAddress]: token,
      };

      const result = svc.convertAssetAndFeeListToFeesBreakdown(
        assetAndFeeList,
        tokensMap,
      );

      expect(result).toHaveLength(2);

      // Check network fee
      expect(result[0]).toEqual({
        name: "Network fees",
        amount: 1_0000n, // 0.0001 ICP in e8s
        tokenAddress: tokenAddress,
        tokenSymbol: "ICP",
        tokenDecimals: 8,
        usdAmount: 0.000301,
      });

      // Check link creation fee
      expect(result[1]).toEqual({
        name: "Link creation fee",
        amount: 2_0000n, // 0.0002 ICP in e8s
        tokenAddress: tokenAddress,
        tokenSymbol: "ICP",
        tokenDecimals: 8,
        usdAmount: 0.000602,
      });
    });

    it("should skip items without fees", () => {
      const tokenAddress = assets[0].address.toString();
      const token: TokenWithPriceAndBalance = {
        address: tokenAddress,
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const assetAndFeeList: AssetAndFee[] = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(1.0),
            usdValueStr: formatNumber(3.01),
          },
          fee: undefined, // No fee
        },
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(0.0001),
            usdValueStr: formatNumber(0.000301),
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(0.0001),
            symbol: "ICP",
            price: 3.01,
            usdValue: 0.000301,
            usdValueStr: formatNumber(0.000301),
          },
        },
      ];

      const tokensMap: Record<string, TokenWithPriceAndBalance> = {
        [tokenAddress]: token,
      };

      const result = svc.convertAssetAndFeeListToFeesBreakdown(
        assetAndFeeList,
        tokensMap,
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Network fees");
    });

    it("should skip items when token is not found", () => {
      const tokenAddress = assets[0].address.toString();
      // Use anonymous principal as unknown address (different from assets[0])
      const unknownAddress = Principal.anonymous().toString();

      const assetAndFeeList: AssetAndFee[] = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "UNKNOWN",
            address: unknownAddress,
            amount: formatNumber(1.0),
            usdValueStr: undefined,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(0.0001),
            symbol: "UNKNOWN",
            usdValue: 0,
            usdValueStr: undefined,
          },
        },
      ];

      const tokensMap: Record<string, TokenWithPriceAndBalance> = {
        [tokenAddress]: {
          address: tokenAddress,
          decimals: 8,
          fee: 1_0000n,
          symbol: "ICP",
          priceUSD: 3.01,
        } as unknown as TokenWithPriceAndBalance,
      };

      const result = svc.convertAssetAndFeeListToFeesBreakdown(
        assetAndFeeList,
        tokensMap,
      );

      expect(result).toHaveLength(0);
    });

    it("should handle fees with zero USD value", () => {
      const tokenAddress = assets[0].address.toString();
      const token: TokenWithPriceAndBalance = {
        address: tokenAddress,
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: undefined, // No price
      } as unknown as TokenWithPriceAndBalance;

      const assetAndFeeList: AssetAndFee[] = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(0.0001),
            usdValueStr: undefined,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(0.0001),
            symbol: "ICP",
            price: undefined,
            usdValue: undefined,
            usdValueStr: undefined,
          },
        },
      ];

      const tokensMap: Record<string, TokenWithPriceAndBalance> = {
        [tokenAddress]: token,
      };

      const result = svc.convertAssetAndFeeListToFeesBreakdown(
        assetAndFeeList,
        tokensMap,
      );

      expect(result).toHaveLength(1);
      expect(result[0].usdAmount).toBe(0);
    });

    it("should handle formatted numbers with commas", () => {
      const tokenAddress = assets[0].address.toString();
      const token: TokenWithPriceAndBalance = {
        address: tokenAddress,
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const assetAndFeeList: AssetAndFee[] = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: "1,000.0001",
            usdValueStr: "3,010.000301",
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: "1,000.0001", // Formatted with commas
            symbol: "ICP",
            price: 3.01,
            usdValue: 3010.000301,
            usdValueStr: formatNumber(3010.000301),
          },
        },
      ];

      const tokensMap: Record<string, TokenWithPriceAndBalance> = {
        [tokenAddress]: token,
      };

      const result = svc.convertAssetAndFeeListToFeesBreakdown(
        assetAndFeeList,
        tokensMap,
      );

      expect(result).toHaveLength(1);
      // Should parse correctly: 1000.0001 * 10^8 = 100000010000n
      expect(result[0].amount).toBe(100_000_010_000n);
    });
  });

  describe("buildFeesBreakdownFromAssetAndFeeList", () => {
    it("builds breakdown using tokens array and skips entries without fees or tokens", () => {
      const tokenAddress = assets[0].address.toString();
      const token: TokenWithPriceAndBalance = {
        address: tokenAddress,
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const assetAndFeeList: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(0.0001),
            usdValueStr: formatNumber(0.000301),
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(0.0001),
            symbol: "ICP",
            price: 3.01,
            usdValue: 0.000301,
            usdValueStr: formatNumber(0.000301),
          },
        },
        {
          // fee is missing -> should be skipped
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(1),
            usdValueStr: formatNumber(3.01),
          },
          fee: undefined,
        },
        {
          // token not in list -> should be skipped
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "UNKNOWN",
            address: Principal.anonymous().toString(),
            amount: formatNumber(0.0001),
            usdValueStr: undefined,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(0.0001),
            symbol: "UNKNOWN",
            usdValue: 0,
            usdValueStr: undefined,
          },
        },
      ];

      const result = svc.buildFeesBreakdownFromAssetAndFeeList(
        assetAndFeeList,
        [token] as unknown as TokenWithPriceAndBalance[],
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: "Network fees",
        amount: 1_0000n,
        tokenAddress,
        tokenSymbol: "ICP",
        tokenDecimals: 8,
        usdAmount: 0.000301,
      });
    });
  });

  describe("buildFeesBreakdownFromAssetAndFeeList (standalone function)", () => {
    it("should convert AssetAndFeeList to FeeBreakdownItem[] format", () => {
      const tokenAddress = assets[0].address.toString();
      const token: TokenWithPriceAndBalance = {
        address: tokenAddress,
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const assetAndFeeList: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(0.0001),
            usdValueStr: formatNumber(0.000301),
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(0.0001),
            symbol: "ICP",
            price: 3.01,
            usdValue: 0.000301,
            usdValueStr: formatNumber(0.000301),
          },
        },
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(0.0002),
            usdValueStr: formatNumber(0.000602),
          },
          fee: {
            feeType: FeeType.CREATE_LINK_FEE,
            amount: formatNumber(0.0002),
            symbol: "ICP",
            price: 3.01,
            usdValue: 0.000602,
            usdValueStr: formatNumber(0.000602),
          },
        },
      ];

      const result = svc.buildFeesBreakdownFromAssetAndFeeList(
        assetAndFeeList,
        [token] as unknown as TokenWithPriceAndBalance[],
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: "Network fees",
        amount: 1_0000n,
        tokenAddress,
        tokenSymbol: "ICP",
        tokenDecimals: 8,
        usdAmount: 0.000301,
      });
      expect(result[1]).toEqual({
        name: "Link creation fee",
        amount: 2_0000n,
        tokenAddress,
        tokenSymbol: "ICP",
        tokenDecimals: 8,
        usdAmount: 0.000602,
      });
    });

    it("should skip entries without fees", () => {
      const tokenAddress = assets[0].address.toString();
      const token: TokenWithPriceAndBalance = {
        address: tokenAddress,
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const assetAndFeeList: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(0.0001),
            usdValueStr: formatNumber(0.000301),
          },
          fee: undefined, // No fee -> should be skipped
        },
      ];

      const result = svc.buildFeesBreakdownFromAssetAndFeeList(
        assetAndFeeList,
        [token] as unknown as TokenWithPriceAndBalance[],
      );

      expect(result).toHaveLength(0);
    });

    it("should skip entries with tokens not found in tokens array", () => {
      const tokenAddress = assets[0].address.toString();
      // Use anonymous principal as unknown address (different from assets[0])
      const unknownAddress = Principal.anonymous().toString();
      const token: TokenWithPriceAndBalance = {
        address: tokenAddress,
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const assetAndFeeList: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "UNKNOWN",
            address: unknownAddress,
            amount: formatNumber(0.0001),
            usdValueStr: undefined,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(0.0001),
            symbol: "UNKNOWN",
            usdValue: 0,
            usdValueStr: undefined,
          },
        },
      ];

      const result = svc.buildFeesBreakdownFromAssetAndFeeList(
        assetAndFeeList,
        [token] as unknown as TokenWithPriceAndBalance[],
      );

      expect(result).toHaveLength(0);
    });

    it("should handle empty assetAndFeeList", () => {
      const token: TokenWithPriceAndBalance = {
        address: assets[0].address.toString(),
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const result = svc.buildFeesBreakdownFromAssetAndFeeList([], [
        token,
      ] as unknown as TokenWithPriceAndBalance[]);

      expect(result).toHaveLength(0);
    });

    it("should handle empty tokens array", () => {
      const tokenAddress = assets[0].address.toString();
      const assetAndFeeList: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(0.0001),
            usdValueStr: formatNumber(0.000301),
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(0.0001),
            symbol: "ICP",
            price: 3.01,
            usdValue: 0.000301,
            usdValueStr: formatNumber(0.000301),
          },
        },
      ];

      const result = svc.buildFeesBreakdownFromAssetAndFeeList(
        assetAndFeeList,
        [],
      );

      expect(result).toHaveLength(0);
    });

    it("should correctly parse fee amounts with commas", () => {
      const tokenAddress = assets[0].address.toString();
      const token: TokenWithPriceAndBalance = {
        address: tokenAddress,
        decimals: 8,
        fee: 1_0000n,
        symbol: "ICP",
        priceUSD: 3.01,
      } as unknown as TokenWithPriceAndBalance;

      const assetAndFeeList: AssetAndFeeList = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "ICP",
            address: tokenAddress,
            amount: formatNumber(1.234567),
            usdValueStr: formatNumber(3.716045),
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(1.234567), // May contain commas
            symbol: "ICP",
            price: 3.01,
            usdValue: 3.716045,
            usdValueStr: formatNumber(3.716045),
          },
        },
      ];

      const result = svc.buildFeesBreakdownFromAssetAndFeeList(
        assetAndFeeList,
        [token] as unknown as TokenWithPriceAndBalance[],
      );

      expect(result).toHaveLength(1);
      // Verify that the amount is correctly parsed (1.234567 * 10^8 = 123456700)
      expect(result[0].amount).toBeGreaterThan(0n);
      expect(result[0].usdAmount).toBe(3.716045);
    });
  });
});
