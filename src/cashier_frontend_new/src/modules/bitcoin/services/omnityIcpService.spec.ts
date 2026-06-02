/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockBuildActor, mockGetRedeemFee, mockGenerateTicketV2 } = vi.hoisted(
  () => ({
    mockBuildActor: vi.fn(),
    mockGetRedeemFee: vi.fn(),
    mockGenerateTicketV2: vi.fn(),
  }),
);

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    buildActor: mockBuildActor,
  },
}));

vi.mock("$modules/bitcoin/constants", () => ({
  OMNITY_ICP_CANISTER_ID: "be2us-64aaa-aaaaa-qaabq-cai",
}));

vi.mock("$lib/generated/omnity_icp/omnity_icp.did", () => ({
  idlFactory: vi.fn(),
}));

describe("OmnityIcpService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_return_redeem_fee", async () => {
    mockGetRedeemFee.mockResolvedValue([10_000n]);
    mockBuildActor.mockReturnValue({
      get_redeem_fee: mockGetRedeemFee,
      generate_ticket_v2: mockGenerateTicketV2,
    });

    const { omnityIcpService } = await import("./omnityIcpService");
    const result = await omnityIcpService.getRedeemFee("Bitcoin");

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(10_000n);
    expect(mockGetRedeemFee).toHaveBeenCalledWith("Bitcoin");
  });

  it("should_return_ticket_id_when_generate_ticket_v2_succeeds", async () => {
    mockGenerateTicketV2.mockResolvedValue({
      Ok: { ticket_id: "ticket-123" },
    });
    mockBuildActor.mockReturnValue({
      get_redeem_fee: mockGetRedeemFee,
      generate_ticket_v2: mockGenerateTicketV2,
    });

    const { omnityIcpService } = await import("./omnityIcpService");
    const result = await omnityIcpService.generateTicketV2({
      action: { Redeem: null },
      token_id: "omnity-rune-id",
      from_subaccount: [],
      target_chain_id: "Bitcoin",
      amount: 100n,
      receiver: "tb1qreceiver",
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe("ticket-123");
  });
});
