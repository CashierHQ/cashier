import { describe, expect, it } from "vitest";
import { WalletViewType } from "$modules/shared/types/wallet";
import { getWalletContentClass } from "./walletDrawer";

const BASE_CLASSES = "flex-1 min-h-0 flex flex-col p-4";

describe("getWalletContentClass", () => {
  it("adds top spacing and vertical scrolling for the main wallet view", () => {
    expect(getWalletContentClass(WalletViewType.MAIN)).toBe(
      `${BASE_CLASSES} overflow-y-auto pt-10`,
    );
  });

  it("clips overflow for the manage wallet view", () => {
    expect(getWalletContentClass(WalletViewType.MANAGE)).toBe(
      `${BASE_CLASSES} overflow-hidden`,
    );
  });

  it.each([
    WalletViewType.TOKEN,
    WalletViewType.RECEIVE,
    WalletViewType.SEND,
    WalletViewType.IMPORT,
    WalletViewType.ADD_NFT,
  ])(
    "keeps %s views vertically scrollable without extra top spacing",
    (viewType) => {
      expect(getWalletContentClass(viewType)).toBe(
        `${BASE_CLASSES} overflow-y-auto`,
      );
    },
  );
});
