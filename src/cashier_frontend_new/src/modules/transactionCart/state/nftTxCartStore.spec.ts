import { describe, expect, it, vi, beforeEach } from "vitest";
import { Principal } from "@icp-sdk/core/principal";
import { Ok } from "ts-results-es";
import { ReceiveAddressType } from "$modules/wallet/types";
import type { EnrichedNFT } from "$modules/wallet/types/nft";
import type { NftSource } from "$modules/transactionCart/types/transactionSource";

const { mockExtTransfer, mockIcrc7Transfer, MockExtService, MockIcrc7Service } =
  vi.hoisted(() => {
    const mockExtTransfer = vi.fn();
    const mockIcrc7Transfer = vi.fn();

    return {
      mockExtTransfer,
      mockIcrc7Transfer,
      MockExtService: vi.fn(() => ({
        transfer: mockExtTransfer,
      })),
      MockIcrc7Service: vi.fn(() => ({
        transfer: mockIcrc7Transfer,
      })),
    };
  });

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: { owner: "aaaaa-aa" },
  },
}));

vi.mock("$modules/wallet/services/extService", () => ({
  ExtService: MockExtService,
}));

vi.mock("$modules/wallet/services/icrc7Service", () => ({
  Icrc7Service: MockIcrc7Service,
}));

import { authState } from "$modules/auth/state/auth.svelte";
import { NftTxCartStore } from "$modules/transactionCart/state/nftTxCartStore.svelte";

const COLLECTION_ID = "kembn-6qaaa-aaaag-qc7ga-cai";
const RECIPIENT = Principal.fromText("aaaaa-aa");

function createNft(standard?: string): EnrichedNFT {
  return {
    collectionId: COLLECTION_ID,
    tokenId: 239n,
    name: "NFT #239",
    description: "",
    imageUrl: "",
    collectionName: "Test Collection",
    standard,
  };
}

function createSource(
  standard: string | undefined,
  receiveType = ReceiveAddressType.PRINCIPAL,
  to: Principal | string = RECIPIENT,
): NftSource {
  return {
    nft: createNft(standard),
    collectionStandard: standard,
    to,
    receiveType,
  };
}

describe("NftTxCartStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authState).account = {
      owner: "aaaaa-aa",
    } as typeof authState.account;
    mockExtTransfer.mockResolvedValue(Ok(100n));
    mockIcrc7Transfer.mockResolvedValue(Ok(200n));
  });

  it("should transfer EXT NFT to principal", async () => {
    const source = createSource("EXT");
    const store = new NftTxCartStore(source);

    const result = await store.execute();

    expect(MockExtService).toHaveBeenCalledWith(COLLECTION_ID);
    expect(mockExtTransfer).toHaveBeenCalledWith(239n, {
      principal: RECIPIENT,
    });
    expect(result.unwrap()).toBe(100n);
    expect(store.state).toBe("SUCCESS");
  });

  it("should transfer EXT NFT to account identifier", async () => {
    const accountId = "a".repeat(64);
    const source = createSource(
      "EXT",
      ReceiveAddressType.ACCOUNT_ID,
      accountId,
    );
    const store = new NftTxCartStore(source);

    const result = await store.execute();

    expect(mockExtTransfer).toHaveBeenCalledWith(239n, {
      address: accountId,
    });
    expect(result.unwrap()).toBe(100n);
  });

  it("should transfer ICRC-7 NFT to principal", async () => {
    const source = createSource("ICRC-7");
    const store = new NftTxCartStore(source);

    const result = await store.execute();

    expect(MockIcrc7Service).toHaveBeenCalledWith(COLLECTION_ID);
    expect(mockIcrc7Transfer).toHaveBeenCalledWith(239n, RECIPIENT);
    expect(result.unwrap()).toBe(200n);
    expect(store.state).toBe("SUCCESS");
  });

  it("should support ICRC7 standard spelling", async () => {
    const source = createSource("ICRC7");
    const store = new NftTxCartStore(source);

    const result = await store.execute();

    expect(result.unwrap()).toBe(200n);
  });

  it("should reject ICRC-7 account identifier sends", async () => {
    const source = createSource(
      "ICRC-7",
      ReceiveAddressType.ACCOUNT_ID,
      "a".repeat(64),
    );
    const store = new NftTxCartStore(source);

    const result = await store.execute();

    expect(result.unwrapErr()).toBe(
      "ICRC-7 transfers only support principal addresses.",
    );
    expect(mockIcrc7Transfer).not.toHaveBeenCalled();
    expect(store.state).toBe("FAILED");
  });

  it("should reject unknown standards", async () => {
    const source = createSource("DIP721");
    const store = new NftTxCartStore(source);

    const result = await store.execute();

    expect(result.unwrapErr()).toBe(
      "Sending is not yet supported for this NFT standard.",
    );
    expect(store.state).toBe("FAILED");
  });

  it("should return Err when user is unauthenticated", async () => {
    vi.mocked(authState).account = null as typeof authState.account;
    const source = createSource("EXT");
    const store = new NftTxCartStore(source);

    const result = await store.execute();

    expect(result.unwrapErr()).toBe("User is not authenticated.");
    expect(store.state).toBe("IDLE");
  });

  it("should return Err and mark failed when service throws", async () => {
    mockExtTransfer.mockRejectedValueOnce(new Error("Transfer failed"));
    const source = createSource("EXT");
    const store = new NftTxCartStore(source);

    const result = await store.execute();

    expect(result.unwrapErr()).toBe("Transfer failed");
    expect(store.state).toBe("FAILED");
  });

  it("should update source before executing", async () => {
    const store = new NftTxCartStore(createSource("EXT"));
    store.updateSource(createSource("ICRC-7"));

    const result = await store.execute();

    expect(result.unwrap()).toBe(200n);
    expect(mockExtTransfer).not.toHaveBeenCalled();
    expect(mockIcrc7Transfer).toHaveBeenCalled();
  });
});
