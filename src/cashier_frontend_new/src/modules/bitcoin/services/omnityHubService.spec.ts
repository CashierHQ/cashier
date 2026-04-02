/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockBuildActor, mockQueryTxHash } = vi.hoisted(() => ({
  mockBuildActor: vi.fn(),
  mockQueryTxHash: vi.fn(),
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    buildActor: mockBuildActor,
  },
}));

vi.mock("$modules/bitcoin/constants", () => ({
  OMNITY_HUB_CANISTER_ID: "be2us-64aaa-aaaaa-qaabq-cai",
}));

vi.mock("$lib/generated/omnity_hub/omnity_hub.did", () => ({
  idlFactory: vi.fn(),
}));

describe("OmnityHubService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_return_btc_txid_for_ticket", async () => {
    mockQueryTxHash.mockResolvedValue({ Ok: "btc-txid-123" });
    mockBuildActor.mockReturnValue({
      query_tx_hash: mockQueryTxHash,
    });

    const { omnityHubService } = await import("./omnityHubService");
    const result = await omnityHubService.queryTxHash("ticket-123");

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe("btc-txid-123");
    expect(mockQueryTxHash).toHaveBeenCalledWith("ticket-123");
  });
});
