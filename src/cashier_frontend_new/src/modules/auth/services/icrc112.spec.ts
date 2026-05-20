import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import type { Signer, Transport } from "@slide-computer/signer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Icrc112RequestInput } from "$modules/auth/types/icrc112";
import Icrc112Service from "./icrc112";

const { buildActorMock, callCanisterViaIcrc49RawMock } = vi.hoisted(() => ({
  buildActorMock: vi.fn(),
  callCanisterViaIcrc49RawMock: vi.fn(),
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    buildActor: buildActorMock,
  },
}));

vi.mock("$modules/auth/services/icrc49", () => ({
  callCanisterViaIcrc49Raw: callCanisterViaIcrc49RawMock,
}));

const sender = "aaaaa-aa";
const cashierBackendCanisterId = "jjio5-5aaaa-aaaam-adhaq-cai";
const ledgerCanisterId = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
const targetCanisterId = Principal.fromText("mxzaz-hqaaa-aaaar-qaada-cai");

const bytes = (values: number[]): ArrayBuffer => new Uint8Array(values).buffer;

const makeService = () => {
  const sendRequest = vi.fn();
  const signer = { sendRequest } as unknown as Signer<Transport>;

  return {
    sendRequest,
    service: new Icrc112Service(signer),
    signer,
  };
};

const makeRequest = (
  overrides: Partial<Icrc112RequestInput> = {},
): Icrc112RequestInput => ({
  canister_id: targetCanisterId,
  method: "custom_method",
  arg: bytes([1, 2, 3]),
  ...overrides,
});

describe("Icrc112Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(123_456);
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendBatchRequest", () => {
    it("sends an ICRC-112 batch request and returns success when all responses succeed", async () => {
      const { sendRequest, service } = makeService();
      const request = makeRequest({ nonce: bytes([9, 10]) });
      sendRequest.mockResolvedValue({ result: { responses: [[{}]] } });

      const result = await service.sendBatchRequest(
        [[request]],
        sender,
        cashierBackendCanisterId,
      );

      expect(result).toEqual({ isSuccess: true, errors: null });
      expect(sendRequest).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        id: "icrc112_batch_123456",
        method: "icrc112_batch_call_canister",
        params: {
          sender,
          requests: [
            [
              {
                canisterId: targetCanisterId.toText(),
                method: "custom_method",
                arg: "AQID",
                nonce: "CQo=",
              },
            ],
          ],
          validation: {
            canisterId: cashierBackendCanisterId,
            method: "icrc114_validate",
          },
        },
      });
    });

    it("returns indexed errors from failed parallel responses", async () => {
      const { sendRequest, service } = makeService();
      sendRequest.mockResolvedValue({
        result: {
          responses: [[{}, { error: { message: "Rejected" } }]],
        },
      });

      const result = await service.sendBatchRequest(
        [[makeRequest()]],
        sender,
        cashierBackendCanisterId,
      );

      expect(result).toEqual({
        isSuccess: false,
        errors: ['Sequence 0 Parallel 1 Error: {"message":"Rejected"}'],
      });
    });

    it("returns signer error responses without falling back when the error is supported", async () => {
      const { sendRequest, service } = makeService();
      sendRequest.mockResolvedValue({
        error: { code: 4001, message: "User rejected" },
      });

      const result = await service.sendBatchRequest(
        [[makeRequest()]],
        sender,
        cashierBackendCanisterId,
      );

      expect(result).toEqual({
        isSuccess: false,
        errors: ['{"code":4001,"message":"User rejected"}'],
      });
      expect(callCanisterViaIcrc49RawMock).not.toHaveBeenCalled();
    });

    it("returns thrown signer errors without falling back when the error is supported", async () => {
      const { sendRequest, service } = makeService();
      sendRequest.mockRejectedValue(new Error("Transport disconnected"));

      const result = await service.sendBatchRequest(
        [[makeRequest()]],
        sender,
        cashierBackendCanisterId,
      );

      expect(result).toEqual({
        isSuccess: false,
        errors: ["Transport disconnected"],
      });
      expect(callCanisterViaIcrc49RawMock).not.toHaveBeenCalled();
    });

    it("returns an invalid response error for unexpected signer responses", async () => {
      const { sendRequest, service } = makeService();
      sendRequest.mockResolvedValue({});

      const result = await service.sendBatchRequest(
        [[makeRequest()]],
        sender,
        cashierBackendCanisterId,
      );

      expect(result).toEqual({
        isSuccess: false,
        errors: ["Invalid response structure from signer."],
      });
    });

    it("throws when an ICRC-112 request is missing a canister ID", async () => {
      const { sendRequest, service } = makeService();

      await expect(
        service.sendBatchRequest(
          [[makeRequest({ canister_id: undefined as unknown as Principal })]],
          sender,
          cashierBackendCanisterId,
        ),
      ).rejects.toThrow(
        "ICRC-112 request missing canister_id - malformed request",
      );
      expect(sendRequest).not.toHaveBeenCalled();
    });
  });

  describe("ICRC-49 fallback", () => {
    it("falls back to ICRC-49 for unsupported batch errors and skips validation for successful ledger replies", async () => {
      const { sendRequest, service, signer } = makeService();
      const request = makeRequest({
        canister_id: ledgerCanisterId,
        method: "icrc1_transfer",
      });
      const replyArg = IDL.encode(
        [IDL.Variant({ Ok: IDL.Reserved, Err: IDL.Reserved })],
        [{ Ok: null }],
      );

      sendRequest.mockResolvedValue({
        error: { code: 3001, message: "Not supported" },
      });
      callCanisterViaIcrc49RawMock.mockResolvedValue({ replyArg });

      const result = await service.sendBatchRequest(
        [[request]],
        sender,
        cashierBackendCanisterId,
      );

      expect(result).toEqual({ isSuccess: true, errors: null });
      expect(callCanisterViaIcrc49RawMock).toHaveBeenCalledWith(
        signer,
        Principal.fromText(sender),
        ledgerCanisterId,
        "icrc1_transfer",
        request.arg,
      );
      expect(buildActorMock).not.toHaveBeenCalled();
    });

    it("validates non-ledger fallback replies with ICRC-114", async () => {
      const { sendRequest, service } = makeService();
      const request = makeRequest({ nonce: bytes([8, 9]) });
      const replyArg = bytes([5, 6, 7]);
      const validateMock = vi.fn().mockResolvedValue(true);

      sendRequest.mockRejectedValue(new Error("unsupported method"));
      callCanisterViaIcrc49RawMock.mockResolvedValue({ replyArg });
      buildActorMock.mockReturnValue({ icrc114_validate: validateMock });

      const result = await service.sendBatchRequest(
        [[request]],
        sender,
        cashierBackendCanisterId,
      );

      expect(result).toEqual({ isSuccess: true, errors: null });
      expect(buildActorMock).toHaveBeenCalledWith({
        canisterId: cashierBackendCanisterId,
        idlFactory: expect.any(Function),
      });
      expect(validateMock).toHaveBeenCalledWith({
        canister_id: targetCanisterId,
        method: "custom_method",
        arg: new Uint8Array([1, 2, 3]),
        res: new Uint8Array([5, 6, 7]),
        nonce: [new Uint8Array([8, 9])],
      });
    });

    it("returns validation errors and marks later fallback requests as not processed", async () => {
      const { sendRequest, service } = makeService();
      const validateMock = vi.fn().mockResolvedValue(false);

      sendRequest.mockResolvedValue({
        error: { message: "unsupported batch calls" },
      });
      callCanisterViaIcrc49RawMock.mockResolvedValue({ replyArg: bytes([1]) });
      buildActorMock.mockReturnValue({ icrc114_validate: validateMock });

      const result = await service.sendBatchRequest(
        [[makeRequest()], [makeRequest({ method: "second_method" })]],
        sender,
        cashierBackendCanisterId,
      );

      expect(result).toEqual({
        isSuccess: false,
        errors: [
          "Sequence 0 Parallel 0 Error: Validation failed.",
          "Sequence 1 Parallel 0 Error: Request not processed.",
        ],
      });
      expect(callCanisterViaIcrc49RawMock).toHaveBeenCalledTimes(1);
    });

    it("returns an error when a fallback ledger reply decodes to Err", async () => {
      const { sendRequest, service } = makeService();
      const replyArg = IDL.encode(
        [IDL.Variant({ Ok: IDL.Reserved, Err: IDL.Reserved })],
        [{ Err: null }],
      );

      sendRequest.mockResolvedValue({
        error: { code: 3001 },
      });
      callCanisterViaIcrc49RawMock.mockResolvedValue({ replyArg });

      const result = await service.sendBatchRequest(
        [[makeRequest({ method: "icrc2_approve" })]],
        sender,
        cashierBackendCanisterId,
      );

      expect(result).toEqual({
        isSuccess: false,
        errors: ["Sequence 0 Parallel 0 Error: Ledger call returned Err."],
      });
      expect(buildActorMock).not.toHaveBeenCalled();
    });

    it("reports ICRC-49 fallback call failures", async () => {
      const { sendRequest, service } = makeService();

      sendRequest.mockResolvedValue({
        error: { code: 3001 },
      });
      callCanisterViaIcrc49RawMock.mockRejectedValue(
        new Error("No certified reply"),
      );

      const result = await service.sendBatchRequest(
        [[makeRequest()]],
        sender,
        cashierBackendCanisterId,
      );

      expect(result).toEqual({
        isSuccess: false,
        errors: ["Sequence 0 Parallel 0 Error: No certified reply"],
      });
    });
  });
});
