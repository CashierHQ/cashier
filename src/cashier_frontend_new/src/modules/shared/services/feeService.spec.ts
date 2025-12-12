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
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { Principal } from "@dfinity/principal";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeeService } from "./feeService";

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

      // amount = payload.amount, fee = ledgerFee
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
        expect(typeof p.fee.amountUi).toBe("string");
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
      expect(p.asset.amountUi).toBe(expectedAmountStr);

      // fee should exist and be formatted from token fee
      expect(p.fee).toBeDefined();
      if (p.fee) {
        expect(p.fee.symbol).toBe("ICP");
        expect(p.fee.amountUi).toBe(formatNumber(0.0001));
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

      const expectedTotal = parseBalanceUnits(
        useAmount + LEDGER_FEE * BigInt(maxUse) + LEDGER_FEE,
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

      // Expected formula per asset: asset_amount + (max_use * ledger_fee) + ledger_fee
      if (a) {
        const expectedA = formatNumber(
          parseBalanceUnits(
            useA + BigInt(maxUse) * tokenA.fee + tokenA.fee,
            tokenA.decimals,
          ),
        );
        expect(a.asset.amount).toBe(expectedA);
        expect(a.fee).toBeDefined();
        if (a.fee) {
          expect(a.fee.symbol).toBe("TKNA");
          expect(typeof a.fee.amountUi).toBe("string");
        }
      }

      if (b) {
        const expectedB = formatNumber(
          parseBalanceUnits(
            useB + BigInt(maxUse) * tokenB.fee + tokenB.fee,
            tokenB.decimals,
          ),
        );
        expect(b.asset.amount).toBe(expectedB);
        expect(b.fee).toBeDefined();
        if (b.fee) {
          expect(b.fee.symbol).toBe("TKNB");
          expect(typeof b.fee.amountUi).toBe("string");
        }
      }

      if (c) {
        const expectedC = formatNumber(
          parseBalanceUnits(
            useC + BigInt(maxUse) * tokenC.fee + tokenC.fee,
            tokenC.decimals,
          ),
        );
        expect(c.asset.amount).toBe(expectedC);
        expect(c.fee).toBeDefined();
        if (c.fee) {
          expect(c.fee.symbol).toBe("TKNC");
          expect(typeof c.fee.amountUi).toBe("string");
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

      // total = payload + ICP_LEDGER_FEE (10_000n)
      const expectedTotal = parseBalanceUnits(100_000_000n + 10_000n, 8);
      expect(p.asset.amount).toBe(expectedTotal.toString());
      expect(p.fee).toBeDefined();
      if (p.fee) {
        expect(p.fee.amountUi).toBe(parseBalanceUnits(10_000n, 8).toString());
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
        expect(p.fee.amountUi).toBe(
          formatNumber(parseBalanceUnits(30_000n, token.decimals)),
        );
      }
    });
  });
});
