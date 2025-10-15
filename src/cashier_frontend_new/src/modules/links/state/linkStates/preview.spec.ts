import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinkStore } from "../linkStore.svelte";
import { LinkStep } from "../../types/linkStep";
import { cashierBackendService } from "../../services/cashierBackend";
import { Ok, Err } from "ts-results-es";
import type {
  LinkDto,
  AssetInfoDto,
  ActionDto,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { Principal } from "@dfinity/principal";

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

    vi.spyOn(cashierBackendService, "createAction").mockResolvedValue(
      Ok(mockActionDto) as unknown as Awaited<
        ReturnType<typeof cashierBackendService.createAction>
      >,
    );
  });

  it("should transition back to ADD_ASSET successfully", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "My tip";

    // Act: move to ADD_ASSET then set tip and move to PREVIEW
    await store.goNext();
    store.tipLink = { asset: "aaaaa-aa", amount: 10 };
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
    store.title = "My tip";

    // Act: get to PREVIEW
    await store.goNext();
    store.tipLink = { asset: "aaaaa-aa", amount: 10 };
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
    store.title = "My tip";

    // Act: move to PREVIEW
    await store.goNext();
    store.tipLink = { asset: "aaaaa-aa", amount: 10 };
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
