import { describe, expect, it, vi, beforeEach } from "vitest";
import { Principal } from "@icp-sdk/core/principal";

const { mockBuildActor, mockExtTransfer } = vi.hoisted(() => ({
  mockBuildActor: vi.fn(),
  mockExtTransfer: vi.fn(),
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: { owner: "aaaaa-aa" },
    buildActor: mockBuildActor,
  },
}));

import { authState } from "$modules/auth/state/auth.svelte";
import { ExtService } from "$modules/wallet/services/extService";

const COLLECTION_ID = "kembn-6qaaa-aaaag-qc7ga-cai";

describe("ExtService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authState).account = {
      owner: "aaaaa-aa",
    } as typeof authState.account;
    mockBuildActor.mockReturnValue({
      ext_transfer: mockExtTransfer,
    });
  });

  it("should build an authenticated actor and transfer to a principal", async () => {
    mockExtTransfer.mockResolvedValue({ ok: 100n });
    const to = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const service = new ExtService(COLLECTION_ID);

    const result = await service.transfer(239n, { principal: to });

    expect(mockBuildActor).toHaveBeenCalledWith({
      canisterId: COLLECTION_ID,
      idlFactory: expect.any(Function),
    });
    expect(mockExtTransfer).toHaveBeenCalledWith({
      to: { principal: to },
      from: { principal: Principal.fromText("aaaaa-aa") },
      token: "4el4t-lykor-uwiaa-aaaaa-buaxz-qaqca-aaadx-q",
      notify: false,
      subaccount: [],
      memo: [],
      amount: 1n,
    });
    expect(result.unwrap()).toBe(100n);
  });

  it("should transfer to an EXT account identifier", async () => {
    mockExtTransfer.mockResolvedValue({ ok: 101n });
    const service = new ExtService(COLLECTION_ID);

    const result = await service.transfer(239n, {
      address: "a".repeat(64),
    });

    expect(mockExtTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ to: { address: "a".repeat(64) } }),
    );
    expect(result.unwrap()).toBe(101n);
  });

  it("should return Err when actor is unavailable", async () => {
    mockBuildActor.mockReturnValue(null);
    const service = new ExtService(COLLECTION_ID);

    const result = await service.transfer(1n, {
      principal: Principal.fromText("aaaaa-aa"),
    });

    expect(result.unwrapErr()).toBe("User is not authenticated");
  });

  it("should return Err when account is unavailable", async () => {
    vi.mocked(authState).account = null as typeof authState.account;
    const service = new ExtService(COLLECTION_ID);

    const result = await service.transfer(1n, {
      principal: Principal.fromText("aaaaa-aa"),
    });

    expect(result.unwrapErr()).toBe("User is not authenticated");
  });

  it("should return Err for unsafe EXT token ids", async () => {
    const service = new ExtService(COLLECTION_ID);

    const result = await service.transfer(
      BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      {
        principal: Principal.fromText("aaaaa-aa"),
      },
    );

    expect(result.unwrapErr()).toBe("Invalid EXT token id");
    expect(mockExtTransfer).not.toHaveBeenCalled();
  });

  it.each([
    [
      { CannotNotify: "recipient-account" },
      "Cannot notify recipient: recipient-account",
    ],
    [{ InsufficientBalance: null }, "Insufficient balance"],
    [{ InvalidToken: "bad-token" }, "Invalid token: bad-token"],
    [{ Rejected: null }, "Transfer rejected"],
    [
      { Unauthorized: "source-account" },
      "Unauthorized transfer from source-account",
    ],
    [{ Other: "custom error" }, "custom error"],
  ])("should map EXT transfer error %#", async (err, message) => {
    mockExtTransfer.mockResolvedValue({ err });
    const service = new ExtService(COLLECTION_ID);

    const result = await service.transfer(239n, {
      principal: Principal.fromText("aaaaa-aa"),
    });

    expect(result.unwrapErr()).toBe(message);
  });
});
