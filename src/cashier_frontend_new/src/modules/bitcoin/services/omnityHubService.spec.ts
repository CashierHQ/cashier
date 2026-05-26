/**
 * @vitest-environment jsdom
 */
import { OMNITY_TARGET_CHAIN_ID } from "$modules/bitcoin/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockBuildActor, mockQueryTxHash, mockGetTxsWithAccount } = vi.hoisted(
  () => ({
    mockBuildActor: vi.fn(),
    mockQueryTxHash: vi.fn(),
    mockGetTxsWithAccount: vi.fn(),
  }),
);

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    buildActor: mockBuildActor,
  },
}));

vi.mock("$modules/bitcoin/constants", () => ({
  OMNITY_HUB_CANISTER_ID: "be2us-64aaa-aaaaa-qaabq-cai",
  OMNITY_TARGET_CHAIN_ID: "eICP",
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
      get_txs_with_account: mockGetTxsWithAccount,
    });

    const { omnityHubService } = await import("./omnityHubService");
    const result = await omnityHubService.queryTxHash("ticket-123");

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe("btc-txid-123");
    expect(mockQueryTxHash).toHaveBeenCalledWith("ticket-123");
  });

  it("should_return_tickets_for_account_query", async () => {
    mockGetTxsWithAccount.mockResolvedValue({
      Ok: [
        {
          token: "omnity-rune-id",
          action: { Redeem: null },
          dst_chain: "Bitcoin",
          memo: [],
          ticket_id: "ticket-123",
          sender: ["aaaaa-aa"],
          ticket_time: 1_700_000_000n,
          ticket_type: { Normal: null },
          src_chain: OMNITY_TARGET_CHAIN_ID,
          amount: "1200",
          receiver: "tb1qreceiver",
        },
      ],
    });
    mockBuildActor.mockReturnValue({
      query_tx_hash: mockQueryTxHash,
      get_txs_with_account: mockGetTxsWithAccount,
    });

    const { omnityHubService } = await import("./omnityHubService");
    const result = await omnityHubService.getTxsWithAccount({
      sender: "aaaaa-aa",
      receiver: "tb1qreceiver",
      tokenId: "omnity-rune-id",
      timeRange: [1_699_913_600n, 1_700_000_000n],
      start: 0n,
      limit: 100n,
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toHaveLength(1);
    expect(mockGetTxsWithAccount).toHaveBeenCalledWith(
      ["aaaaa-aa"],
      ["tb1qreceiver"],
      ["omnity-rune-id"],
      [[1_699_913_600n, 1_700_000_000n]],
      0n,
      100n,
    );
  });
});
