import { Principal } from "@icp-sdk/core/principal";
import type {
  BatchCallCanisterResponse,
  Signer,
  Transport,
} from "@slide-computer/signer";
import { describe, expect, it, vi } from "vitest";
import type { BatchCallProgress } from "$modules/auth/signer/types";
import Icrc112Service from "$modules/icrc112/services/icrc112Service";

const CANISTER_ID = Principal.fromText("aaaaa-aa");

function buildRequests(intentIdsA: string[], intentIdsB: string[]) {
  return [
    [
      {
        canister_id: CANISTER_ID,
        method: "icrc2_approve",
        arg: new ArrayBuffer(0),
        intentIds: intentIdsA,
      },
      {
        canister_id: CANISTER_ID,
        method: "icrc1_transfer",
        arg: new ArrayBuffer(0),
        intentIds: intentIdsB,
      },
    ],
  ];
}

function successResponse(): BatchCallCanisterResponse {
  return {
    id: "id",
    jsonrpc: "2.0",
    result: {
      responses: [
        [
          { result: { contentMap: "a", certificate: "b" } },
          { result: { contentMap: "c", certificate: "d" } },
        ],
      ],
    },
  } as unknown as BatchCallCanisterResponse;
}

describe("Icrc112Service.sendBatchRequest", () => {
  it("calls onRequestSettled once per position with correct intentIds and success flags", async () => {
    let capturedListener: ((p: BatchCallProgress) => void) | undefined;
    const unsubscribe = vi.fn();
    const channel = {
      onBatchProgress: vi.fn((listener: (p: BatchCallProgress) => void) => {
        capturedListener = listener;
        return unsubscribe;
      }),
    };
    const sendRequest = vi.fn().mockImplementation(async () => {
      // Simulate the signer/channel emitting progress before the aggregate resolves.
      capturedListener?.({
        sequenceIndex: 0,
        parallelIndex: 0,
        response: { result: { contentMap: "a", certificate: "b" } },
      });
      capturedListener?.({
        sequenceIndex: 0,
        parallelIndex: 1,
        response: { error: { code: 4000, message: "failed" } },
      });
      return successResponse();
    });
    const signer = {
      openChannel: vi.fn().mockResolvedValue(channel),
      sendRequest,
    } as unknown as Signer<Transport>;

    const service = new Icrc112Service(signer);
    const onRequestSettled = vi.fn();

    const result = await service.sendBatchRequest(
      buildRequests(["intent-1"], ["intent-2", "intent-3"]),
      "sender-principal",
      "cashier-backend-id",
      onRequestSettled,
    );

    expect(result.isSuccess).toBe(true);
    expect(onRequestSettled).toHaveBeenCalledTimes(2);
    expect(onRequestSettled).toHaveBeenNthCalledWith(
      1,
      ["intent-1"],
      true,
      undefined,
    );
    expect(onRequestSettled).toHaveBeenNthCalledWith(
      2,
      ["intent-2", "intent-3"],
      false,
      JSON.stringify({ code: 4000, message: "failed" }),
    );
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("does not subscribe to channel progress when no callback is provided", async () => {
    const channel = { onBatchProgress: vi.fn() };
    const signer = {
      openChannel: vi.fn().mockResolvedValue(channel),
      sendRequest: vi.fn().mockResolvedValue(successResponse()),
    } as unknown as Signer<Transport>;

    const service = new Icrc112Service(signer);
    await service.sendBatchRequest(
      buildRequests(["intent-1"], ["intent-2"]),
      "sender-principal",
      "cashier-backend-id",
    );

    expect(signer.openChannel).not.toHaveBeenCalled();
    expect(channel.onBatchProgress).not.toHaveBeenCalled();
  });

  it("gracefully degrades when the channel does not support onBatchProgress", async () => {
    const channel = {};
    const signer = {
      openChannel: vi.fn().mockResolvedValue(channel),
      sendRequest: vi.fn().mockResolvedValue(successResponse()),
    } as unknown as Signer<Transport>;

    const service = new Icrc112Service(signer);
    const onRequestSettled = vi.fn();

    const result = await service.sendBatchRequest(
      buildRequests(["intent-1"], ["intent-2"]),
      "sender-principal",
      "cashier-backend-id",
      onRequestSettled,
    );

    expect(result.isSuccess).toBe(true);
    expect(onRequestSettled).not.toHaveBeenCalled();
  });
});
