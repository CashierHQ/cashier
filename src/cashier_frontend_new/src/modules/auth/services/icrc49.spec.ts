import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import type { Signer } from "@slide-computer/signer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  callCanisterViaIcrc49,
  callCanisterViaIcrc49Raw,
} from "./icrc49";

const {
  certificateCreateMock,
  cborDecodeMock,
  requestIdOfMock,
  LookupStatusMock,
} = vi.hoisted(() => ({
  certificateCreateMock: vi.fn(),
  cborDecodeMock: vi.fn(),
  requestIdOfMock: vi.fn(),
  LookupStatusMock: {
    Found: "found",
  },
}));

vi.mock("@dfinity/agent", () => ({
  Cbor: {
    decode: cborDecodeMock,
  },
  Certificate: {
    create: certificateCreateMock,
  },
  IC_ROOT_KEY: "00",
  LookupStatus: LookupStatusMock,
  requestIdOf: requestIdOfMock,
}));

const sender = Principal.fromText("aaaaa-aa");
const canisterId = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

const bytes = (values: number[]): ArrayBuffer => new Uint8Array(values).buffer;

const makeSigner = (
  response: Awaited<ReturnType<Signer["callCanister"]>>,
): Signer =>
  ({
    callCanister: vi.fn().mockResolvedValue(response),
  }) as unknown as Signer;

describe("callCanisterViaIcrc49", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("encodes the argument, calls the signer, and decodes the reply", async () => {
    const contentMap = bytes([1, 2, 3]);
    const certificate = bytes([4, 5, 6]);
    const replyArg = IDL.encode([IDL.Nat], [123n]);
    const signer = makeSigner({ contentMap, certificate });

    cborDecodeMock.mockReturnValue({ reply: { arg: replyArg } });

    const result = await callCanisterViaIcrc49<bigint>(
      signer,
      sender,
      canisterId,
      "icrc1_balance_of",
      [IDL.Text],
      [IDL.Nat],
      "owner-account",
    );

    expect(result).toBe(123n);
    expect(signer.callCanister).toHaveBeenCalledWith({
      canisterId,
      sender,
      method: "icrc1_balance_of",
      arg: IDL.encode([IDL.Text], ["owner-account"]),
    });
  });
});

describe("callCanisterViaIcrc49Raw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the signer response with a direct reply argument", async () => {
    const contentMap = bytes([1]);
    const certificate = bytes([2]);
    const arg = bytes([3]);
    const replyArg = bytes([4]);
    const signer = makeSigner({ contentMap, certificate });

    cborDecodeMock.mockReturnValue({ reply: { arg: replyArg } });

    const result = await callCanisterViaIcrc49Raw(
      signer,
      sender,
      canisterId,
      "transfer",
      arg,
    );

    expect(result).toEqual({ contentMap, certificate, replyArg });
    expect(signer.callCanister).toHaveBeenCalledWith({
      canisterId,
      sender,
      method: "transfer",
      arg,
    });
    expect(certificateCreateMock).not.toHaveBeenCalled();
  });

  it("extracts the reply argument from the certified request status", async () => {
    const contentMap = bytes([10]);
    const certificate = bytes([11]);
    const arg = bytes([12]);
    const replyArg = bytes([13]);
    const requestId = bytes([14]);
    const ingressExpiry = { toFixed: vi.fn(() => "123456789") };
    const lookupMock = vi.fn((path: unknown[]) => {
      if (path.at(-1) === "status") {
        return {
          status: LookupStatusMock.Found,
          value: new TextEncoder().encode("replied").buffer,
        };
      }

      return {
        status: LookupStatusMock.Found,
        value: replyArg,
      };
    });
    const signer = makeSigner({ contentMap, certificate });

    cborDecodeMock.mockReturnValue({
      canister_id: canisterId,
      ingress_expiry: ingressExpiry,
      method_name: "transfer",
      request_type: "call",
      sender,
    });
    requestIdOfMock.mockReturnValue(requestId);
    certificateCreateMock.mockResolvedValue({ lookup: lookupMock });

    const result = await callCanisterViaIcrc49Raw(
      signer,
      sender,
      canisterId,
      "transfer",
      arg,
    );

    expect(result.replyArg).toBe(replyArg);
    expect(requestIdOfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ingress_expiry: 123456789n,
      }),
    );
    expect(certificateCreateMock).toHaveBeenCalledWith({
      certificate,
      rootKey: expect.any(ArrayBuffer),
      canisterId,
    });
    expect(lookupMock).toHaveBeenCalledWith([
      "request_status",
      requestId,
      "status",
    ]);
    expect(lookupMock).toHaveBeenCalledWith([
      "request_status",
      requestId,
      "reply",
    ]);
  });

  it("throws when neither the content map nor certificate contains a reply", async () => {
    const contentMap = bytes([20]);
    const certificate = bytes([21]);
    const arg = bytes([22]);
    const requestId = bytes([23]);
    const signer = makeSigner({ contentMap, certificate });

    cborDecodeMock.mockReturnValue({ request_type: "call" });
    requestIdOfMock.mockReturnValue(requestId);
    certificateCreateMock.mockResolvedValue({
      lookup: vi.fn(() => ({ status: "absent" })),
    });

    await expect(
      callCanisterViaIcrc49Raw(signer, sender, canisterId, "transfer", arg),
    ).rejects.toThrow("ICRC-49 transfer: no reply in response");
  });
});
