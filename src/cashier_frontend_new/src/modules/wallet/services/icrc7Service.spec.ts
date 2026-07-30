import { describe, expect, it, vi, beforeEach } from "vitest";
import { Principal } from "@icp-sdk/core/principal";

const { mockBuildActor, mockIcrc7Transfer } = vi.hoisted(() => ({
  mockBuildActor: vi.fn(),
  mockIcrc7Transfer: vi.fn(),
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: { owner: "aaaaa-aa" },
    buildActor: mockBuildActor,
  },
}));

import { authState } from "$modules/auth/state/auth.svelte";
import { Icrc7Service } from "$modules/wallet/services/icrc7Service";

const COLLECTION_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

describe("Icrc7Service transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authState).account = {
      owner: "aaaaa-aa",
    } as typeof authState.account;
    mockBuildActor.mockReturnValue({
      icrc7_transfer: mockIcrc7Transfer,
    });
  });

  it("should transfer successfully and return block index", async () => {
    mockIcrc7Transfer.mockResolvedValue([[{ Ok: 123n }]]);
    const to = Principal.fromText("aaaaa-aa");
    const service = new Icrc7Service(COLLECTION_ID);

    const result = await service.transfer(7n, to);

    expect(mockBuildActor).toHaveBeenCalledWith({
      canisterId: COLLECTION_ID,
      idlFactory: expect.any(Function),
    });
    expect(mockIcrc7Transfer).toHaveBeenCalledWith([
      {
        to: { owner: to, subaccount: [] },
        token_id: 7n,
        memo: [],
        from_subaccount: [],
        created_at_time: [],
      },
    ]);
    expect(result.unwrap()).toBe(123n);
  });

  it("should return Err when actor is unavailable", async () => {
    mockBuildActor.mockReturnValue(null);
    const service = new Icrc7Service(COLLECTION_ID);

    const result = await service.transfer(7n, Principal.fromText("aaaaa-aa"));

    expect(result.unwrapErr()).toBe("User is not authenticated");
  });

  it("should return Err when ledger returns no response for the token", async () => {
    mockIcrc7Transfer.mockResolvedValue([[]]);
    const service = new Icrc7Service(COLLECTION_ID);

    const result = await service.transfer(7n, Principal.fromText("aaaaa-aa"));

    expect(result.unwrapErr()).toBe("No response from ledger");
  });

  it("should treat Duplicate as successful idempotent transfer", async () => {
    mockIcrc7Transfer.mockResolvedValue([
      [{ Err: { Duplicate: { duplicate_of: 42n } } }],
    ]);
    const service = new Icrc7Service(COLLECTION_ID);

    const result = await service.transfer(7n, Principal.fromText("aaaaa-aa"));

    expect(result.unwrap()).toBe(42n);
  });

  it.each([
    [
      { GenericError: { message: "Test error", error_code: 500n } },
      "Test error (code: 500)",
    ],
    [{ NonExistingTokenId: null }, "Token does not exist"],
    [{ Unauthorized: null }, "Unauthorized transfer"],
    [{ CreatedInFuture: { ledger_time: 1000n } }, "Created in future: 1000"],
    [{ InvalidRecipient: null }, "Invalid recipient"],
    [
      { GenericBatchError: { message: "Batch error", error_code: 400n } },
      "Batch error (code: 400)",
    ],
    [{ TooOld: null }, "Transaction is too old"],
  ])("should map ICRC-7 transfer error %#", async (err, message) => {
    mockIcrc7Transfer.mockResolvedValue([[{ Err: err }]]);
    const service = new Icrc7Service(COLLECTION_ID);

    const result = await service.transfer(7n, Principal.fromText("aaaaa-aa"));

    expect(result.unwrapErr()).toBe(message);
  });
});
