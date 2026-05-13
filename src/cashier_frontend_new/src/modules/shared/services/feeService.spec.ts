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
import { FeeService } from "./feeService";
import { FlowDirection } from "$modules/transactionCart/types/transactionSource";
import { FeeType } from "$modules/links/types/fee";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";
import type { WalletAssetInput } from "$modules/shared/types/feeService";

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

const createIntentWithPayloadAndAsset = (
  id: string,
  task: IntentTask,
  amount: bigint,
  asset: Asset,
): Intent => {
  const payload: IntentPayload = new TransferData(
    toWallet,
    asset,
    fromWallet,
    amount,
  );
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
    it("should return consistent fee information on multiple calls", () => {
      const feeInfo1 = svc.getLinkCreationFee();
      const feeInfo2 = svc.getLinkCreationFee();

      expect(feeInfo1).toEqual(feeInfo2);
    });
  });

  describe("forecastLinkCreationFees", () => {
    it("handles three tokens with different decimals and ledger fees", () => {
      const linkFeeInfo = svc.getLinkCreationFee();
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

      const linkFeeToken = {
        address: linkFeeInfo.tokenAddress,
        decimals: 8,
        fee: 10_000n,
        symbol: "ICP",
        priceUSD: 1.0,
      } as unknown as TokenWithPriceAndBalance;

      const tokensMap = {
        [tokenA.address]: tokenA,
        [tokenB.address]: tokenB,
        [tokenC.address]: tokenC,
        [linkFeeToken.address]: linkFeeToken,
      } as Record<string, TokenWithPriceAndBalance>;

      const useA = 1_000_000_00n; // 100_000_000
      const useB = 2_000_000_00n; // 200_000_000
      const useC = 3_000n;
      const maxUse = 2; // test non-trivial maxUse

      const pairsResult = svc.forecastLinkCreationFees(
        [
          { address: tokenA.address, useAmount: useA },
          { address: tokenB.address, useAmount: useB },
          { address: tokenC.address, useAmount: useC },
        ],
        maxUse,
        tokensMap,
      );
      expect(pairsResult.isOk()).toBe(true);
      const pairs = pairsResult.unwrap();

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
            useA * BigInt(maxUse) + tokenA.fee * (2n + BigInt(maxUse)),
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
            useB * BigInt(maxUse) + tokenB.fee * (2n + BigInt(maxUse)),
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
            useC * BigInt(maxUse) + tokenC.fee * (2n + BigInt(maxUse)),
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

    it("should return error when token is missing", () => {
      const unknownAddress = "unknown-token-address";
      const pairsResult = svc.forecastLinkCreationFees(
        [{ address: unknownAddress, useAmount: 100_000_000n }],
        1,
        {},
      );
      expect(pairsResult.isErr()).toBe(true);
      expect(pairsResult.isErr() && pairsResult.error.message).toBe(
        `Token not found for address ${unknownAddress}`,
      );
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
          1,
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
          1,
          tokensMap,
          to.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.direction).toBe(FlowDirection.INCOMING);
        expect(result[0].fee).toBeDefined();
        expect(result[0].fee?.amount).toBe(0n);
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
          1,
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
          1,
          tokensMap,
          from.getPrincipal().toText(),
        );

        expect(result).toHaveLength(1);
        expect(result[0].asset.label).toBe("");
        expect(result[0].fee?.feeType).toBe(FeeType.NETWORK_FEE);
      });

      it("subtracts one ledger fee from CREATE_LINK_FEE when deposited token equals link-creation-fee token", () => {
        // Make fee token address match the token used in this action.
        vi.spyOn(svc, "getLinkCreationFee").mockReturnValue({
          amount: 10_000n,
          tokenAddress,
          symbol: "ICP",
          decimals: 8,
        });

        // A "complete" CREATE_LINK action must include both:
        // - funding intent (TRANSFER_WALLET_TO_LINK)
        // - fee intent (TRANSFER_WALLET_TO_TREASURY)
        //
        // Baseline: fund the link with a different token so there's no overlap.
        const otherPrincipal = Principal.anonymous();
        const otherTokenAddress = otherPrincipal.toText();
        const otherAsset = new Asset(otherPrincipal);
        const tokensMapWithOther = {
          ...tokensMap,
          [otherTokenAddress]: createMockToken(otherTokenAddress, {
            symbol: "OTHER",
            decimals: 8,
            fee: LEDGER_FEE,
            priceUSD: undefined,
          }),
        };

        const withDifferentFundingAsset = createMockAction(
          ActionType.CREATE_LINK,
          [
            createIntentWithPayloadAndAsset(
              "funding-asset",
              IntentTask.TRANSFER_WALLET_TO_LINK,
              100_000_000n,
              otherAsset,
            ),
            createIntentWithPayload(
              "treasury",
              IntentTask.TRANSFER_WALLET_TO_TREASURY,
              100_000_000n,
            ),
          ],
        );

        const withFundingAsset = createMockAction(ActionType.CREATE_LINK, [
          createIntentWithPayload(
            "funding-asset",
            IntentTask.TRANSFER_WALLET_TO_LINK,
            100_000_000n,
          ),
          createIntentWithPayload(
            "treasury",
            IntentTask.TRANSFER_WALLET_TO_TREASURY,
            100_000_000n,
          ),
        ]);

        const resA = svc.buildFromAction(
          withDifferentFundingAsset,
          1,
          tokensMapWithOther,
          from.getPrincipal().toText(),
        );
        const resB = svc.buildFromAction(
          withFundingAsset,
          1,
          tokensMap,
          from.getPrincipal().toText(),
        );

        const createLinkFeeA = resA.find(
          (p) => p.fee?.feeType === FeeType.CREATE_LINK_FEE,
        );
        const createLinkFeeB = resB.find(
          (p) => p.fee?.feeType === FeeType.CREATE_LINK_FEE,
        );

        expect(createLinkFeeA).toBeDefined();
        expect(createLinkFeeB).toBeDefined();

        if (!createLinkFeeA || !createLinkFeeB) return;

        // When the deposited token equals the fee token, displayed total should be reduced by one ledger fee.
        expect(createLinkFeeB.asset.amount).toBe(
          createLinkFeeA.asset.amount - LEDGER_FEE,
        );
      });

      it("does not subtract ledger fee when deposited token differs from link-creation-fee token", () => {
        // Fee token is ICP (tokenAddress). We'll deposit a different token to the link.
        vi.spyOn(svc, "getLinkCreationFee").mockReturnValue({
          amount: 10_000n,
          tokenAddress,
          symbol: "ICP",
          decimals: 8,
        });

        const otherPrincipal = Principal.anonymous();
        const otherTokenAddress = otherPrincipal.toText();
        const otherAsset = new Asset(otherPrincipal);
        const tokensMapWithOther = {
          ...tokensMap,
          [otherTokenAddress]: createMockToken(otherTokenAddress, {
            symbol: "OTHER",
            decimals: 8,
            fee: LEDGER_FEE,
            priceUSD: undefined,
          }),
        };

        // "Complete" action but with different funding token so there's no overlap.
        const withDifferentFundingAssetZeroAmount = createMockAction(
          ActionType.CREATE_LINK,
          [
            createIntentWithPayloadAndAsset(
              "funding-asset",
              IntentTask.TRANSFER_WALLET_TO_LINK,
              0n,
              otherAsset,
            ),
            createIntentWithPayload(
              "treasury",
              IntentTask.TRANSFER_WALLET_TO_TREASURY,
              100_000_000n,
            ),
          ],
        );

        const withDifferentFundingAsset = createMockAction(
          ActionType.CREATE_LINK,
          [
            createIntentWithPayloadAndAsset(
              "funding-asset",
              IntentTask.TRANSFER_WALLET_TO_LINK,
              100_000_000n,
              otherAsset,
            ),
            createIntentWithPayload(
              "treasury",
              IntentTask.TRANSFER_WALLET_TO_TREASURY,
              100_000_000n,
            ),
          ],
        );

        const resA = svc.buildFromAction(
          withDifferentFundingAssetZeroAmount,
          1,
          tokensMapWithOther,
          from.getPrincipal().toText(),
        );
        const resB = svc.buildFromAction(
          withDifferentFundingAsset,
          1,
          tokensMapWithOther,
          from.getPrincipal().toText(),
        );

        const createLinkFeeA = resA.find(
          (p) => p.fee?.feeType === FeeType.CREATE_LINK_FEE,
        );
        const createLinkFeeB = resB.find(
          (p) => p.fee?.feeType === FeeType.CREATE_LINK_FEE,
        );

        expect(createLinkFeeA).toBeDefined();
        expect(createLinkFeeB).toBeDefined();
        if (!createLinkFeeA || !createLinkFeeB) return;

        // Since the deposited token differs, no network-fee overlap should be subtracted.
        expect(createLinkFeeB.asset.amount).toBe(createLinkFeeA.asset.amount);
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
          1,
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
          1,
          tokensMap,
          from.getPrincipal().toText(),
        );

        expect(result).toHaveLength(2);
        expect(result[0].asset.intentId).toBe("id-6a");
        expect(result[1].asset.intentId).toBe("id-6b");
      });
    });

    describe("with token not found in map", () => {
      it("throws when token is not found", () => {
        const intent = createIntentWithPayload(
          "id-8",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        expect(() =>
          svc.buildFromAction(action, 1, {}, from.getPrincipal().toText()),
        ).toThrow(`Token not found for address ${tokenAddress}`);
      });

      it("throws when token is not found for fallback fee case", () => {
        const intent = createIntentWithPayload(
          "id-9",
          IntentTask.TRANSFER_WALLET_TO_LINK,
          100_000_000n,
        );
        const action = createMockAction(ActionType.SEND, [intent]);

        expect(() =>
          svc.buildFromAction(action, 1, {}, from.getPrincipal().toText()),
        ).toThrow(`Token not found for address ${tokenAddress}`);
      });
    });

    describe("edge cases", () => {
      const token = createMockToken(tokenAddress);
      const tokensMap = { [tokenAddress]: token };

      it("handles action with empty intents array", () => {
        const action = createMockAction(ActionType.SEND, []);

        const result = svc.buildFromAction(
          action,
          1,
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

describe("FeeService - mocked $shared edge cases", () => {
  it("clamps CREATE_LINK_FEE asset amount to 0 when overlap subtraction would go negative", async () => {
    vi.resetModules();
    const tokenAddress = assets[0].address.toString();

    // Local mock: make calculateIntentFees return a total equal to exactly one ledger fee.
    vi.doMock("$shared", async () => {
      const actual = await vi.importActual<typeof import("$shared")>("$shared");
      return {
        ...actual,
        calculateIntentFees: vi.fn(() => ({
          intent_total_amount: "0",
          intent_total_network_fee: LEDGER_FEE.toString(),
          intent_user_fee: "0",
        })),
      };
    });

    const { FeeService: FeeServiceWithMock } = await import("./feeService");
    const localSvc = new FeeServiceWithMock();

    vi.spyOn(localSvc, "getLinkCreationFee").mockReturnValue({
      amount: 0n,
      tokenAddress,
      symbol: "ICP",
      decimals: 8,
    });

    const token = createMockToken(tokenAddress, {
      symbol: "ICP",
      decimals: 8,
      fee: LEDGER_FEE,
      priceUSD: undefined,
    });
    const tokensMap = { [tokenAddress]: token };

    const action = createMockAction(ActionType.CREATE_LINK, [
      createIntentWithPayload(
        "funding-asset",
        IntentTask.TRANSFER_WALLET_TO_LINK,
        1n,
      ),
      createIntentWithPayload(
        "treasury",
        IntentTask.TRANSFER_WALLET_TO_TREASURY,
        1n,
      ),
    ]);

    const res = localSvc.buildFromAction(
      action,
      1,
      tokensMap,
      from.getPrincipal().toText(),
    );
    const createLinkFee = res.find(
      (p) => p.fee?.feeType === FeeType.CREATE_LINK_FEE,
    );
    expect(createLinkFee).toBeDefined();
    expect(createLinkFee?.asset.amount).toBe(0n);
  });

  it("forecastLinkCreationFees uses intent_total_amount + intent_total_network_fee for asset amount and USD", async () => {
    vi.resetModules();

    const totalAmount = 1_000_000n;
    const totalNetworkFee = 250_000n;

    vi.doMock("$shared", async () => {
      const actual = await vi.importActual<typeof import("$shared")>("$shared");
      return {
        ...actual,
        calculateIntentFees: vi.fn(() => ({
          intent_total_amount: totalAmount.toString(),
          intent_total_network_fee: totalNetworkFee.toString(),
          intent_user_fee: "0",
        })),
      };
    });

    const { FeeService: FeeServiceWithMock } = await import("./feeService");
    const localSvc = new FeeServiceWithMock();

    const token = createMockToken("mock-token", {
      symbol: "MOCK",
      decimals: 8,
      fee: LEDGER_FEE,
      priceUSD: 2.0,
    });

    // Also provide the link-fee token required by forecastLinkCreationFees.
    const linkFeeInfo = localSvc.getLinkCreationFee();
    const linkFeeToken = createMockToken(linkFeeInfo.tokenAddress, {
      symbol: "ICP",
      decimals: 8,
      fee: LEDGER_FEE,
      priceUSD: 1.0,
    });

    const tokensMap = {
      [token.address]: token,
      [linkFeeToken.address]: linkFeeToken,
    } as Record<string, TokenWithPriceAndBalance>;

    const res = localSvc.forecastLinkCreationFees(
      [{ address: token.address, useAmount: 123n }],
      3,
      tokensMap,
    );

    expect(res.isOk()).toBe(true);
    const pairs = res.unwrap();
    const assetPair = pairs.find((p) => p.asset.address === token.address);
    expect(assetPair).toBeDefined();
    if (!assetPair) return;

    const expectedRaw = totalAmount + totalNetworkFee;
    const expectedUi = parseBalanceUnits(expectedRaw, token.decimals);
    expect(assetPair.asset.amount).toBe(formatNumber(expectedUi));
    expect(assetPair.asset.usdValueStr).toBeDefined();
  });
});
