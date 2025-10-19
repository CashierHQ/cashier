import { describe, expect, it } from "vitest";
import { LinkType } from "./linkType";

describe("LinkType.toBackendType", () => {
  it("maps TIP to SendTip", () => {
    // Arrange
    const t = LinkType.TIP;

    // Act
    const backend = t.toBackendType();

    // Assert
    expect(backend).toEqual({ SendTip: null });
  });

  it("maps AIRDROP to SendAirdrop", () => {
    // Arrange
    const t = LinkType.AIRDROP;

    // Act
    const backend = t.toBackendType();

    // Assert
    expect(backend).toEqual({ SendAirdrop: null });
  });

  it("maps TOKEN_BASKET to SendTokenBasket", () => {
    // Arrange
    const t = LinkType.TOKEN_BASKET;

    // Act
    const backend = t.toBackendType();

    // Assert
    expect(backend).toEqual({ SendTokenBasket: null });
  });
});
