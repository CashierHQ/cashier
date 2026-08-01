import type { BatchCallCanisterRequest } from "@slide-computer/signer";
import { toBase64 } from "@slide-computer/signer";
import { describe, expect, it, vi } from "vitest";

const { pollForResponseMock, certificateCreateMock, cborEncodeMock } =
  vi.hoisted(() => ({
    pollForResponseMock: vi.fn().mockResolvedValue(undefined),
    certificateCreateMock: vi.fn(),
    cborEncodeMock: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
  }));

vi.mock("@icp-sdk/core/agent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@icp-sdk/core/agent")>();

  class FakeHttpAgent {
    rootKey = new Uint8Array([0]);
    #transform?: (req: { body: unknown }) => unknown;

    addTransform(_kind: string, cb: (req: { body: unknown }) => unknown) {
      this.#transform = cb;
    }

    async call(_canisterId: unknown, opts: { methodName: string }) {
      await this.#transform?.({ body: {} });
      // Deterministically fail the "test_method_b" request so tests can
      // assert on a mixed success/error batch without depending on
      // parallel-execution ordering.
      if (opts.methodName === "test_method_b") {
        throw new Error("simulated call failure");
      }
      return { requestId: new Uint8Array([1]) };
    }

    async readState() {
      return { certificate: new Uint8Array([9, 9, 9]) };
    }

    static async from() {
      return new FakeHttpAgent();
    }
  }

  return {
    ...actual,
    Actor: { createActor: vi.fn() },
    Cbor: { encode: cborEncodeMock },
    Certificate: { create: certificateCreateMock },
    HttpAgent: FakeHttpAgent,
    LookupPathStatus: { Found: "Found", Unknown: "Unknown", Absent: "Absent" },
    polling: { pollForResponse: pollForResponseMock },
  };
});

import type { HttpAgent } from "@icp-sdk/core/agent";
import { IIChannel } from "$modules/auth/signer/ii/IIChannel";
import type { BatchCallProgress } from "$modules/auth/signer/types";

function buildBatchRequest(): BatchCallCanisterRequest {
  // A single sequence group with two parallel requests: with only one
  // top-level (sequence) entry, no validation canister is required (the
  // implementation's "validation required" check only triggers when there is
  // more than one sequence group).
  return {
    jsonrpc: "2.0",
    id: "batch-1",
    method: "icrc112_batch_call_canister",
    params: {
      sender: "aaaaa-aa",
      requests: [
        [
          {
            canisterId: "aaaaa-aa",
            method: "test_method_a",
            arg: toBase64(new Uint8Array([1])),
          },
          {
            canisterId: "aaaaa-aa",
            method: "test_method_b",
            arg: toBase64(new Uint8Array([2])),
          },
        ],
      ],
    },
  };
}

describe("IIChannel batch progress", () => {
  it("notifies onBatchProgress once per sub-request, before the aggregate response event", async () => {
    certificateCreateMock.mockResolvedValue({
      lookup_path: (path: string[]) => {
        const last = path[path.length - 1];
        if (last === "status") {
          return {
            status: "Found",
            value: new TextEncoder().encode("replied"),
          };
        }
        return { status: "Found", value: new Uint8Array([1]) };
      },
    });

    const channel = new IIChannel({} as unknown as HttpAgent);
    const events: string[] = [];
    const progress: BatchCallProgress[] = [];

    channel.onBatchProgress((p) => {
      progress.push(p);
      events.push("progress");
    });
    channel.addEventListener("response", () => {
      events.push("response");
    });

    await channel.send(buildBatchRequest());

    // "test_method_a" (parallelIndex 0) succeeds, "test_method_b" (parallelIndex 1)
    // is made to fail (see FakeHttpAgent.call) - both run in the same parallel
    // group, so we match by content rather than assuming resolution order.
    expect(progress).toHaveLength(2);
    const successEvent = progress.find((p) => "result" in p.response);
    const errorEvent = progress.find((p) => "error" in p.response);
    expect(successEvent).toMatchObject({ sequenceIndex: 0, parallelIndex: 0 });
    expect(errorEvent).toMatchObject({ sequenceIndex: 0, parallelIndex: 1 });

    // Progress fires per-request, strictly before the aggregate "response" event.
    expect(events.filter((e) => e === "progress")).toHaveLength(2);
    expect(events.at(-1)).toBe("response");
    expect(events.indexOf("response")).toBe(events.length - 1);
  });

  it("unsubscribe stops further notifications", async () => {
    certificateCreateMock.mockResolvedValue({
      lookup_path: (path: string[]) => {
        const last = path[path.length - 1];
        if (last === "status") {
          return {
            status: "Found",
            value: new TextEncoder().encode("replied"),
          };
        }
        return { status: "Found", value: new Uint8Array([1]) };
      },
    });

    const channel = new IIChannel({} as unknown as HttpAgent);
    const progress: BatchCallProgress[] = [];
    const unsubscribe = channel.onBatchProgress((p) => progress.push(p));
    unsubscribe();

    await channel.send(buildBatchRequest());

    expect(progress).toHaveLength(0);
  });
});
