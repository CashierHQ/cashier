import type {
  ActionDto,
  AssetInfoDto,
  LinkDto,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import {
  CreateLinkAsset,
  CreateLinkData,
} from "$modules/links/types/createLinkData";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Principal } from "@dfinity/principal";
import { Err, Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cashierBackendService } from "../../services/cashierBackend";
import { LinkStep } from "../../types/linkStep";
import { LinkStore } from "../linkStore.svelte";

// mock wallet store
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

const mockLinkDto: LinkDto = {
  id: "mock-link-id",
  title: "My tip link",
  creator: Principal.fromText("aaaaa-aa"),
  asset_info: [
    {
      asset: { IC: { address: Principal.fromText("aaaaa-aa") } },
      amount_per_link_use_action: 100n,
      label: "SEND_TIP_ASSET",
    } as AssetInfoDto,
  ],
  link_type: { SendTip: null },
  create_at: BigInt(Date.now()),
  state: { CreateLink: null },
  link_use_action_max_count: 1n,
  link_use_action_counter: 0n,
};

const mockActionDto: ActionDto = {
  id: "mock-action-id",
  icrc_112_requests: [],
  creator: Principal.fromText("aaaaa-aa"),
  intents: [],
  type: { CreateLink: null },
  state: { Created: null },
};

describe("PreviewState", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(cashierBackendService, "createLinkV2").mockResolvedValue(
      Ok({ link: mockLinkDto, action: mockActionDto }) as unknown as Awaited<
        ReturnType<typeof cashierBackendService.createLinkV2>
      >,
    );
  });

  it("should transition back to ADD_ASSET successfully", async () => {
    // Arrange
    const store = new LinkStore();
    store.createLinkData.title = "My tip";

    // Act: move to ADD_ASSET then set tip and move to PREVIEW
    await store.goNext();
    store.createLinkData = new CreateLinkData({
      title: "Test",
      linkType: store.createLinkData.linkType,
      maxUse: 1,
      assets: [new CreateLinkAsset("aaaaa-aa", 100n)],
    });
    await store.goNext();

    // Assert precondition
    expect(store.state.step).toEqual(LinkStep.PREVIEW);

    // Act: go back
    await store.goBack();

    // Assert: returned to ADD_ASSET
    expect(store.state.step).toEqual(LinkStep.ADD_ASSET);
  });

  it("should trainsition to CREATED successfully", async () => {
    // Arrange
    const store = new LinkStore();
    store.createLinkData.title = "My tip";

    // Act: get to PREVIEW
    await store.goNext();
    store.createLinkData = new CreateLinkData({
      title: "Test",
      linkType: store.createLinkData.linkType,
      maxUse: 1,
      assets: [new CreateLinkAsset("aaaaa-aa", 100n)],
    });
    await store.goNext();

    // Ensure backend mock returns Ok
    vi.spyOn(cashierBackendService, "createLinkV2").mockResolvedValue(
      Ok({ link: mockLinkDto, action: mockActionDto }) as unknown as Awaited<
        ReturnType<typeof cashierBackendService.createLinkV2>
      >,
    );

    // Act: create the link
    await store.goNext();

    // Assert: id set and state transitioned to CREATED
    expect(store.id).toEqual(mockLinkDto.id);
    expect(store.state.step).toEqual(LinkStep.CREATED);
  });

  it("should throws when backend returns Err", async () => {
    // Arrange
    const store = new LinkStore();
    store.createLinkData.title = "My tip";

    // Act: move to PREVIEW
    await store.goNext();
    store.createLinkData = new CreateLinkData({
      title: "Test",
      linkType: store.createLinkData.linkType,
      maxUse: 1,
      assets: [new CreateLinkAsset("aaaaa-aa", 100n)],
    });
    await store.goNext();

    // Arrange: mock backend to return Err
    vi.spyOn(cashierBackendService, "createLinkV2").mockResolvedValue(
      Err(new Error("boom")) as unknown as Awaited<
        ReturnType<typeof cashierBackendService.createLinkV2>
      >,
    );

    // Act + Assert: goNext should throw with backend error message
    await expect(store.goNext()).rejects.toThrow("Link creation failed: boom");
  });
});
