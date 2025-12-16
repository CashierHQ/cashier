import { describe, it, expect } from "vitest";
import {
  getStatusLabel,
  getStatusClasses,
  getLinkDefaultAvatar,
  getLinkTypeText,
  isSendLinkType,
  isPaymentLinkType,
} from "./linkItemHelpers";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";

describe("linkItemHelpers", () => {
  const mockT = (key: string): string => {
    const translations: Record<string, string> = {
      "links.status.draft": "Draft",
      "links.status.transferPending": "Transfer Pending",
      "links.status.active": "Active",
      "links.status.inactive": "Inactive",
      "links.status.ended": "Ended",
    };
    return translations[key] || key;
  };

  describe("getStatusLabel", () => {
    it("should return draft label for draft states", () => {
      expect(getStatusLabel(LinkState.CHOOSING_TYPE, mockT)).toBe("Draft");
      expect(getStatusLabel(LinkState.ADDING_ASSET, mockT)).toBe("Draft");
      expect(getStatusLabel(LinkState.PREVIEW, mockT)).toBe("Draft");
    });

    it("should return transfer pending label for create link state", () => {
      expect(getStatusLabel(LinkState.CREATE_LINK, mockT)).toBe(
        "Transfer Pending",
      );
    });

    it("should return active label for active state", () => {
      expect(getStatusLabel(LinkState.ACTIVE, mockT)).toBe("Active");
    });

    it("should return inactive label for inactive state", () => {
      expect(getStatusLabel(LinkState.INACTIVE, mockT)).toBe("Inactive");
    });

    it("should return ended label for inactive ended state", () => {
      expect(getStatusLabel(LinkState.INACTIVE_ENDED, mockT)).toBe("Ended");
    });
  });

  describe("getStatusClasses", () => {
    it("should return draft classes for draft states", () => {
      expect(getStatusClasses(LinkState.CHOOSING_TYPE)).toBe(
        "bg-lightyellow text-yellow",
      );
      expect(getStatusClasses(LinkState.ADDING_ASSET)).toBe(
        "bg-lightyellow text-yellow",
      );
      expect(getStatusClasses(LinkState.PREVIEW)).toBe(
        "bg-lightyellow text-yellow",
      );
      expect(getStatusClasses(LinkState.CREATE_LINK)).toBe(
        "bg-lightyellow text-yellow",
      );
    });

    it("should return active classes for active state", () => {
      expect(getStatusClasses(LinkState.ACTIVE)).toBe("bg-green text-white");
    });

    it("should return inactive classes for inactive state", () => {
      expect(getStatusClasses(LinkState.INACTIVE)).toBe(
        "bg-gray-200 text-gray-700",
      );
    });

    it("should return ended classes for inactive ended state", () => {
      expect(getStatusClasses(LinkState.INACTIVE_ENDED)).toBe(
        "bg-red-50 text-red-700",
      );
    });
  });

  describe("getLinkDefaultAvatar", () => {
    it("should return tip link default avatar", () => {
      expect(getLinkDefaultAvatar(LinkType.TIP)).toBe("/tip-link-default.svg");
    });

    it("should return airdrop default avatar", () => {
      expect(getLinkDefaultAvatar(LinkType.AIRDROP)).toBe(
        "/airdrop-default.svg",
      );
    });

    it("should return token basket default avatar", () => {
      expect(getLinkDefaultAvatar(LinkType.TOKEN_BASKET)).toBe(
        "/token-basket-default.svg",
      );
    });

    it("should return receive payment default avatar", () => {
      expect(getLinkDefaultAvatar(LinkType.RECEIVE_PAYMENT)).toBe(
        "/receive-payment-default.svg",
      );
    });
  });

  describe("getLinkTypeText", () => {
    it("should return Send Tip for TIP link type", () => {
      expect(getLinkTypeText(LinkType.TIP)).toBe("Send Tip");
    });

    it("should return Send Airdrop for AIRDROP link type", () => {
      expect(getLinkTypeText(LinkType.AIRDROP)).toBe("Send Airdrop");
    });

    it("should return Receive Payment for RECEIVE_PAYMENT link type", () => {
      expect(getLinkTypeText(LinkType.RECEIVE_PAYMENT)).toBe("Receive Payment");
    });

    it("should return Send Token Basket for TOKEN_BASKET link type", () => {
      expect(getLinkTypeText(LinkType.TOKEN_BASKET)).toBe("Send Token Basket");
    });
  });

  describe("isSendLinkType", () => {
    it("should return true for TIP link type", () => {
      expect(isSendLinkType(LinkType.TIP)).toBe(true);
    });

    it("should return true for AIRDROP link type", () => {
      expect(isSendLinkType(LinkType.AIRDROP)).toBe(true);
    });

    it("should return true for TOKEN_BASKET link type", () => {
      expect(isSendLinkType(LinkType.TOKEN_BASKET)).toBe(true);
    });

    it("should return false for RECEIVE_PAYMENT link type", () => {
      expect(isSendLinkType(LinkType.RECEIVE_PAYMENT)).toBe(false);
    });
  });

  describe("isPaymentLinkType", () => {
    it("should return true for RECEIVE_PAYMENT link type", () => {
      expect(isPaymentLinkType(LinkType.RECEIVE_PAYMENT)).toBe(true);
    });

    it("should return false for TIP link type", () => {
      expect(isPaymentLinkType(LinkType.TIP)).toBe(false);
    });

    it("should return false for AIRDROP link type", () => {
      expect(isPaymentLinkType(LinkType.AIRDROP)).toBe(false);
    });

    it("should return false for TOKEN_BASKET link type", () => {
      expect(isPaymentLinkType(LinkType.TOKEN_BASKET)).toBe(false);
    });
  });
});
