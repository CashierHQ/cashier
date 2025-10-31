import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeeService } from "./feeService";
import { ActionType } from "$modules/links/types/action/actionType";
import IntentTask from "$modules/links/types/action/intentTask";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import Intent from "$modules/links/types/action/intent";
import IntentState from "$modules/links/types/action/intentState";
import Action from "$modules/links/types/action/action";
import IntentType, {
  TransferData,
  type IntentPayload,
} from "$modules/links/types/action/intentType";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import Wallet from "$modules/links/types/wallet";
import Asset from "$modules/links/types/asset";
import { Principal } from "@dfinity/principal";
import { ActionState } from "$modules/links/types/action/actionState";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

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
  return new Intent(id, task, new IntentType(payload), 0n, IntentState.Created);
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
        IntentTask.TransferWalletToTreasury,
        100_000_000n,
      );

      const res = svc.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.CreateLink,
      });

      // amount and fee are ledgerFee*2 + payload.amount
      expect(res.amount).toBe(LEDGER_FEE * 2n + 100_000_000n);
      expect(res.fee).toBe(LEDGER_FEE * 2n + 100_000_000n);
    });

    it("CreateLink + other intent -> amount = ledgerFee + payload.amount, fee = ledgerFee", () => {
      // use a different valid IntentTask (not TransferWalletToTreasury)
      const intent = createIntentWithPayload(
        "id-2",
        IntentTask.TransferWalletToLink,
        100_000_000n,
      );

      const res = svc.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.CreateLink,
      });

      // amount = ledgerFee + payload.amount, fee = ledgerFee
      expect(res.amount).toBe(LEDGER_FEE + 100_000_000n);
      expect(res.fee).toBe(LEDGER_FEE);
    });

    it("Withdraw -> amount = payload.amount - ledgerFee, fee = ledgerFee", () => {
      const intent = createIntentWithPayload(
        "id-3",
        IntentTask.TransferWalletToLink,
        100_000_000n,
      );
      const res = svc.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.Withdraw,
      });

      // amount = payload.amount - ledgerFee, fee = ledgerFee
      expect(res.amount).toBe(100_000_000n - LEDGER_FEE);
      expect(res.fee).toBe(LEDGER_FEE);
    });

    it("Send -> amount = payload.amount + ledgerFee, fee = ledgerFee", () => {
      const intent = createIntentWithPayload(
        "id-4",
        IntentTask.TransferWalletToLink,
        100_000_000n,
      );
      const res = svc.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.Send,
      });

      // amount = payload.amount + ledgerFee, fee = ledgerFee
      expect(res.amount).toBe(100_000_000n + LEDGER_FEE);
      expect(res.fee).toBe(LEDGER_FEE);
    });

    it("Receive -> amount = payload.amount, fee = undefined", () => {
      const intent = createIntentWithPayload(
        "id-5",
        IntentTask.TransferWalletToLink,
        100_000_000n,
      );
      const res = svc.computeAmountAndFee({
        intent,
        ledgerFee: LEDGER_FEE,
        actionType: ActionType.Receive,
      });

      expect(res.amount).toBe(100_000_000n);
      expect(res.fee).toBeUndefined();
    });
  });

  describe("mapActionToAssetAndFeeList", () => {
    it("falls back to ICP values when token not found and uses 'N/A' symbols", () => {
      const svcWithMock = new FeeService();

      const action: Action = {
        type: ActionType.Send,
        intents: [
          createIntentWithPayload(
            "id-6",
            IntentTask.TransferWalletToLink,
            100_000_000n,
          ),
        ],
        id: "action-id-1",
        creator: Ed25519KeyIdentity.generate().getPrincipal(),
        state: ActionState.Created,
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
        type: ActionType.Send,
        intents: [
          createIntentWithPayload(
            "id-7",
            IntentTask.TransferWalletToLink,
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
});
