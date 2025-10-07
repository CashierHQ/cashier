/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinkStore } from "../linkStore.svelte";
import { LinkType } from "../../types/linkType";
import { LinkStep } from "../../types/linkStep";
import { cashierBackendService } from "../../services/cashierBackend";
import { Ok, Err } from "ts-results-es";
import type {
  LinkDto,
  AssetInfoDto,
  Template,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { Principal } from "@dfinity/principal";

// A reusable mock matching the generated LinkDto shape
const mockLinkDto: LinkDto = {
  id: "mock-link-id",
  title: ["My tip link"],
  creator: Principal.fromText("aaaaa-aa"),
  asset_info: [
    {
      asset: { IC: { address: Principal.fromText("aaaaa-aa") } },
      amount_per_link_use_action: 100n,
      label: "SEND_TIP_ASSET",
    } as AssetInfoDto,
  ],
  link_type: [{ SendTip: null }],
  metadata: [["k", "v"]],
  create_at: BigInt(Date.now()),
  description: ["mock description"],
  state: { CreateLink: null },
  template: [{ Central: null } as Template],
  link_use_action_max_count: 1n,
  link_use_action_counter: 0n,
};

describe("Link states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ChooseLinkTypeState -> AddAssetState on valid input", async () => {
    // Arrange: a fresh store with valid inputs
    const store = new LinkStore();
    expect(store.state.step).toEqual(LinkStep.CHOOSE_TYPE);
    store.title = "My tip";
    store.linkType = LinkType.TIP;

    // Act: attempt to go to next step
    await store.goNext();

    // Assert: state advanced to ADD_ASSET
    expect(store.state.step).toEqual(LinkStep.ADD_ASSET);
  });

  it("ChooseLinkTypeState throws if title empty", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "";
    store.linkType = LinkType.TIP;

    // Act
    const res = store.goNext();

    // Assert
    await expect(res).rejects.toThrow("Title is required to proceed");
  });

  it("AddAssetState -> PreviewState with valid tipLink", async () => {
    // Arrange: get to ADD_ASSET
    const store = new LinkStore();
    store.title = "My tip";
    await store.goNext();
    expect(store.state.step).toEqual(LinkStep.ADD_ASSET);

    // Act: provide tip details and go next
    store.tipLink = { asset: "aaaaa-aa", amount: 10 };
    await store.goNext();

    // Assert: moved to PREVIEW
    expect(store.state.step).toEqual(LinkStep.PREVIEW);
  });

  it("AddAssetState throws on missing tipLink details", async () => {
    // Arrange: get to ADD_ASSET
    const store = new LinkStore();
    store.title = "My tip";
    await store.goNext();

    // Act: clear tipLink
    store.tipLink = undefined;

    // Assert: attempting to continue throws
    await expect(store.goNext()).rejects.toThrow(
      "Tip link details are required to proceed",
    );
  });

  it("PreviewState.goNext calls backend and sets id on success", async () => {
    // Arrange: prepare store in PREVIEW state
    const store = new LinkStore();
    store.title = "My tip";
    await store.goNext();
    store.tipLink = { asset: "aaaaa-aa", amount: 10 };
    await store.goNext();
    expect(store.state.step).toEqual(LinkStep.PREVIEW);

    // Mock backend to return a LinkDto-like object
    vi.spyOn(cashierBackendService, "createLink").mockResolvedValue(
      Ok(mockLinkDto) as unknown as Awaited<
        ReturnType<typeof cashierBackendService.createLink>
      >,
    );

    // Act: call goNext to create the link
    await store.goNext();

    // Assert: id set and state is CREATED
    expect(store.id).toEqual(mockLinkDto.id);
    expect(store.state.step).toEqual(LinkStep.CREATED);
  });

  it("PreviewState.goNext throws when backend returns Err (Arrange-Act-Assert)", async () => {
    // Arrange: prepare store in PREVIEW state
    const store = new LinkStore();
    store.title = "My tip";
    await store.goNext();
    store.tipLink = { asset: "aaaaa-aa", amount: 10 };
    await store.goNext();

    // Mock backend to return an error
    vi.spyOn(cashierBackendService, "createLink").mockResolvedValue(
      Err(new Error("boom")) as unknown as Awaited<
        ReturnType<typeof cashierBackendService.createLink>
      >,
    );

    // Act: attempt to create link
    const act = store.goNext();

    // Assert: PreviewState should throw an error with the backend message
    await expect(act).rejects.toThrow("Link creation failed: boom");
  });
});
