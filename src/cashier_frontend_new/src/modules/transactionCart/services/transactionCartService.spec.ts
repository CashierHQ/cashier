import Action from "$modules/links/types/action/action";
import { ActionState } from "$modules/links/types/action/actionState";
import { ActionType } from "$modules/links/types/action/actionType";
import Intent from "$modules/links/types/action/intent";
import IntentState from "$modules/links/types/action/intentState";
import IntentTask from "$modules/links/types/action/intentTask";
import IntentType, { TransferData } from "$modules/links/types/action/intentType";
import Asset from "$modules/links/types/asset";
import Wallet from "$modules/links/types/wallet";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { Principal } from "@dfinity/principal";
import { beforeEach, describe, expect, it } from "vitest";
import { TransactionCartService } from "./transactionCartService";

// Test identities
const userIdentity = Ed25519KeyIdentity.generate();
const userPrincipal = userIdentity.getPrincipal();
const userWallet = new Wallet(userPrincipal, null);
const userWalletAddress = userPrincipal.toString();

const otherIdentity = Ed25519KeyIdentity.generate();
const otherPrincipal = otherIdentity.getPrincipal();
const otherWallet = new Wallet(otherPrincipal, null);

const asset = new Asset(Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"));

// Helper to create Intent
const createIntent = (
  id: string,
  fromWallet: Wallet,
  toWallet: Wallet,
  amount: bigint,
): Intent => {
  const payload = new TransferData(toWallet, asset, fromWallet, amount);
  return new Intent(
    id,
    IntentTask.TRANSFER_WALLET_TO_LINK,
    new IntentType(payload),
    0n,
    IntentState.CREATED,
  );
};

// Mock token
const mockToken: TokenWithPriceAndBalance = {
  address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  symbol: "ICP",
  name: "Internet Computer",
  decimals: 8,
  fee: 10_000n,
  enabled: true,
  is_default: true,
  balance: 1_000_000_000n,
  priceUSD: 10,
};

describe("TransactionCartService", () => {
  let svc: TransactionCartService;

  beforeEach(() => {
    svc = new TransactionCartService();
  });

  describe("isIntentOutgoing", () => {
    it("returns true when from == currentWallet (user is sender)", () => {
      const intent = createIntent("1", userWallet, otherWallet, 100_000_000n);
      expect(svc.isIntentOutgoing(intent, userWalletAddress)).toBe(true);
    });

    it("returns false when from != currentWallet (user is receiver)", () => {
      const intent = createIntent("2", otherWallet, userWallet, 100_000_000n);
      expect(svc.isIntentOutgoing(intent, userWalletAddress)).toBe(false);
    });
  });

  describe("fromAction", () => {
    it("sets isOutgoing based on intent direction", () => {
      // Intent where user is sender (outgoing)
      const outgoingIntent = createIntent(
        "1",
        userWallet,
        otherWallet,
        100_000_000n,
      );

      const action = new Action(
        "action-1",
        userPrincipal,
        ActionType.CREATE_LINK,
        ActionState.CREATED,
        [outgoingIntent],
      );

      const tokens = { [mockToken.address]: mockToken };
      const result = svc.fromAction(action, userWalletAddress, tokens);

      expect(result).toHaveLength(1);
      expect(result[0].asset.isOutgoing).toBe(true);
    });

    it("sets isOutgoing=false for incoming intents", () => {
      // Intent where user is receiver (incoming)
      const incomingIntent = createIntent(
        "2",
        otherWallet,
        userWallet,
        100_000_000n,
      );

      const action = new Action(
        "action-2",
        userPrincipal,
        ActionType.RECEIVE,
        ActionState.CREATED,
        [incomingIntent],
      );

      const tokens = { [mockToken.address]: mockToken };
      const result = svc.fromAction(action, userWalletAddress, tokens);

      expect(result).toHaveLength(1);
      expect(result[0].asset.isOutgoing).toBe(false);
    });

    it("handles mixed direction intents", () => {
      const outgoingIntent = createIntent(
        "1",
        userWallet,
        otherWallet,
        50_000_000n,
      );
      const incomingIntent = createIntent(
        "2",
        otherWallet,
        userWallet,
        100_000_000n,
      );

      const action = new Action(
        "action-3",
        userPrincipal,
        ActionType.CREATE_LINK,
        ActionState.CREATED,
        [outgoingIntent, incomingIntent],
      );

      const tokens = { [mockToken.address]: mockToken };
      const result = svc.fromAction(action, userWalletAddress, tokens);

      expect(result).toHaveLength(2);
      expect(result[0].asset.isOutgoing).toBe(true); // outgoing
      expect(result[1].asset.isOutgoing).toBe(false); // incoming
    });
  });

  describe("fromWalletTransfer", () => {
    it("always returns outgoing=true for wallet transfers", () => {
      const result = svc.fromWalletTransfer(
        100_000_000n,
        mockToken,
        "receiver-address",
      );

      expect(result).toHaveLength(1);
      expect(result[0].asset.isOutgoing).toBe(true);
      expect(result[0].asset.symbol).toBe("ICP");
    });

    it("includes fee information", () => {
      const result = svc.fromWalletTransfer(
        100_000_000n,
        mockToken,
        "receiver-address",
      );

      expect(result[0].fee).toBeDefined();
      expect(result[0].fee?.amount).toBe(10_000n); // token fee
    });
  });
});
