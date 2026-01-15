import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { LinkCreationStore } from "../../linkCreationStore.svelte";
import { TempLink } from "$modules/links/types/tempLink";
import { LinkState } from "$modules/links/types/link/linkState";
import {
  CreateLinkAsset,
  CreateLinkData,
} from "$modules/creationLink/types/createLinkData";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";
import { AddAssetTipLinkState } from "./addAsset";
import { ChooseLinkTypeState } from "../chooseLinkType";
import { PreviewState } from "../preview";
import { Err, Ok } from "ts-results-es";
import { validationService } from "$modules/links/services/validationService";

// Mock locale
vi.mock("$lib/i18n", () => ({
  locale: {
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        "links.linkForm.addAsset.errors.insufficientBalance":
          "Insufficient balance. Required: {{required}} {{tokenSymbol}}, Available: {{available}}",
      };
      return translations[key] || key;
    }),
  },
}));

// Mock parseBalanceUnits and formatNumber
vi.mock("$modules/shared/utils/converter", () => ({
  parseBalanceUnits: vi.fn((amount: bigint, decimals: number) => {
    return Number(amount) / Math.pow(10, decimals);
  }),
}));

vi.mock("$modules/shared/utils/formatNumber", () => ({
  formatNumber: vi.fn((num: number) => num.toFixed(2)),
}));

// Mock validationService
vi.mock("$modules/links/services/validationService", () => ({
  validationService: {
    validateRequiredAmount: vi.fn(),
  },
}));

// Mock wallet store
vi.mock("$modules/token/state/walletStore.svelte", () => {
  const mockWalletTokens: TokenWithPriceAndBalance[] = [
    {
      name: "token1",
      symbol: "TKN1",
      address: "aaaaa-aa",
      decimals: 8,
      enabled: true,
      fee: 10_000n,
      is_default: false,
      balance: 1_000_000n,
      priceUSD: 1.0,
    },
  ];
  const mockQuery = {
    data: mockWalletTokens,
  };

  return {
    walletStore: {
      get query() {
        return mockQuery;
      },
      findTokenByAddress: vi.fn(),
      toggleToken: vi.fn(),
      addToken: vi.fn(),
      transferTokenToPrincipal: vi.fn(),
      transferICPToAccount: vi.fn(),
      icpAccountID: vi.fn(),
    },
    __mockQuery: mockQuery,
  };
});

describe("AddAssetTipLinkState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: validation passes
    vi.mocked(validationService.validateRequiredAmount).mockReturnValue(
      Ok(true),
    );
  });

  describe("goNext()", () => {
    it("should transition to PREVIEW successfully with valid asset", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;

      // Act: move to ADD_ASSET
      await store.goNext();

      // Assert precondition
      expect(store.state.step).toEqual(LinkStep.ADD_ASSET);
      expect(store.state).toBeInstanceOf(AddAssetTipLinkState);

      // Arrange: provide valid tip link details
      store.createLinkData = new CreateLinkData({
        title: "Test Tip",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [new CreateLinkAsset("aaaaa-aa", 100n)],
      });

      // Act: attempt to go next
      await store.goNext();

      // Assert: moved to PREVIEW
      expect(store.state.step).toEqual(LinkStep.PREVIEW);
      expect(store.state).toBeInstanceOf(PreviewState);
      expect(validationService.validateRequiredAmount).toHaveBeenCalledWith(
        store.createLinkData,
        expect.any(Array),
      );
    });

    it("should throw error when assets array is empty", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      // Act: set empty assets array
      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [],
      });

      // Assert
      await expect(store.goNext()).rejects.toThrow(
        "Asset is required to proceed",
      );
    });

    it("should throw error when assets is undefined", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      // Act: set undefined assets
      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [],
      });
      (
        store.createLinkData as unknown as {
          assets: CreateLinkAsset[] | undefined;
        }
      ).assets = undefined;

      // Assert
      await expect(store.goNext()).rejects.toThrow(
        "Asset is required to proceed",
      );
    });

    it("should throw error when more than one asset is provided", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      // Act: set more than one asset
      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [
          new CreateLinkAsset("aaaaa-aa", 100n),
          new CreateLinkAsset("bbbbb-bb", 200n),
        ],
      });

      // Assert
      await expect(store.goNext()).rejects.toThrow(
        "Only one asset is supported for tip links",
      );
    });

    it("should throw error when asset address is empty", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      // Act: set empty address
      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [new CreateLinkAsset("", 100n)],
      });

      // Assert
      await expect(store.goNext()).rejects.toThrow(
        "Address is required to proceed",
      );
    });

    it("should throw error when asset address is only whitespace", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      // Act: set whitespace-only address
      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [new CreateLinkAsset("   ", 100n)],
      });

      // Assert
      await expect(store.goNext()).rejects.toThrow(
        "Address is required to proceed",
      );
    });

    it("should throw error when useAmount is zero", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      // Act: set zero amount
      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [new CreateLinkAsset("aaaaa-aa", 0n)],
      });

      // Assert
      await expect(store.goNext()).rejects.toThrow(
        "Amount must be greater than zero to proceed",
      );
    });

    it("should throw error when useAmount is negative", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      // Act: set negative amount (using BigInt, negative would be -1n)
      // Note: BigInt doesn't support negative in this context, but we test <= 0n
      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [new CreateLinkAsset("aaaaa-aa", -1n)],
      });

      // Assert
      await expect(store.goNext()).rejects.toThrow(
        "Amount must be greater than zero to proceed",
      );
    });

    it("should throw formatted error when validationService returns insufficient balance error", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [new CreateLinkAsset("aaaaa-aa", 100n)],
      });

      // Mock validationService to return insufficient balance error
      vi.mocked(validationService.validateRequiredAmount).mockReturnValue(
        Err(
          new Error(
            "Insufficient amount for asset aaaaa-aa, required: 500000, available: 100000",
          ),
        ),
      );

      // Act & Assert
      await expect(store.goNext()).rejects.toThrow(
        "Insufficient balance. Required: 0.01 TKN1, Available: 0.00",
      );
    });

    it("should throw validation failed error when validationService returns other error", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [new CreateLinkAsset("aaaaa-aa", 100n)],
      });

      // Mock validationService to return other error
      vi.mocked(validationService.validateRequiredAmount).mockReturnValue(
        Err(new Error("Token not found in wallet")),
      );

      // Act & Assert
      await expect(store.goNext()).rejects.toThrow(
        "Validation failed: Token not found in wallet",
      );
    });

    it("should handle validationService error without insufficient amount pattern", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [new CreateLinkAsset("aaaaa-aa", 100n)],
      });

      // Mock validationService to return error without insufficient amount pattern
      vi.mocked(validationService.validateRequiredAmount).mockReturnValue(
        Err(new Error("Some other validation error")),
      );

      // Act & Assert
      await expect(store.goNext()).rejects.toThrow(
        "Validation failed: Some other validation error",
      );
    });

    it("should handle insufficient balance error when token is not found in wallet", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;
      await store.goNext(); // to ADD_ASSET

      store.createLinkData = new CreateLinkData({
        title: "Test",
        linkType: LinkType.TIP,
        maxUse: 1,
        assets: [new CreateLinkAsset("unknown-token", 100n)],
      });

      // Mock validationService to return insufficient balance error for unknown token
      vi.mocked(validationService.validateRequiredAmount).mockReturnValue(
        Err(
          new Error(
            "Insufficient amount for asset unknown-token, required: 500000, available: 100000",
          ),
        ),
      );

      // Act & Assert - should throw validation failed since token not found in wallet
      await expect(store.goNext()).rejects.toThrow(
        "Validation failed: Insufficient amount for asset unknown-token, required: 500000, available: 100000",
      );
    });
  });

  describe("goBack()", () => {
    it("should transition back to ChooseLinkTypeState", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;

      // Act: move to ADD_ASSET
      await store.goNext();

      // Assert precondition
      expect(store.state.step).toEqual(LinkStep.ADD_ASSET);
      expect(store.state).toBeInstanceOf(AddAssetTipLinkState);

      // Act: go back
      await store.goBack();

      // Assert: returned to CHOOSE_TYPE
      expect(store.state.step).toEqual(LinkStep.CHOOSE_TYPE);
      expect(store.state).toBeInstanceOf(ChooseLinkTypeState);
    });
  });

  describe("state properties", () => {
    it("should have step equal to ADD_ASSET", async () => {
      // Arrange
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "My tip",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );
      const store = new LinkCreationStore(tempLink);
      store.createLinkData.title = "My tip";
      store.createLinkData.linkType = LinkType.TIP;

      // Act: move to ADD_ASSET
      await store.goNext();

      // Assert
      expect(store.state.step).toEqual(LinkStep.ADD_ASSET);
    });
  });
});
