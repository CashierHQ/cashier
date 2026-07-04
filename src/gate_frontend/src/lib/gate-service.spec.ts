import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @dfinity/agent before importing gate-service
vi.mock("@dfinity/agent", () => {
  const mockActor = {
    exchange_x_token: vi.fn(),
  };
  return {
    HttpAgent: {
      createSync: vi.fn(() => ({
        fetchRootKey: vi.fn().mockResolvedValue(undefined),
      })),
    },
    Actor: {
      createActor: vi.fn(() => mockActor),
    },
    _mockActor: mockActor,
  };
});

// Mock the generated candid factory
vi.mock("$lib/generated/gate_service/gate_service.did.js", () => ({
  idlFactory: {},
}));

// Mock constants
vi.mock("$lib/constants", () => ({
  GATE_SERVICE_CANISTER_ID: "aaaaa-aa",
  HOST_ICP: "http://localhost:4943",
  X_CLIENT_ID: "test_client_id",
}));

import * as dfinity from "@dfinity/agent";
import { exchangeXToken } from "./gate-service";

function fixture_of_x_token_exchange_result() {
  return {
    access_token: "access_tok_abc",
    profile: {
      id: "user123",
      username: "testuser",
      name: "Test User",
      profile_image_url: "https://pbs.twimg.com/test.jpg",
    },
  };
}

describe("exchangeXToken", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockActor: any;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockActor = (dfinity as any)._mockActor;
    vi.clearAllMocks();
  });

  it("it_should_fail_with_error_when_canister_returns_Err", async () => {
    mockActor.exchange_x_token.mockResolvedValue({
      Err: { KeyVerificationFailed: "token exchange failed" },
    });

    await expect(exchangeXToken("bad_code")).rejects.toThrow(
      "Gate service error",
    );
  });

  it("it_should_return_XTokenExchangeResult_on_Ok", async () => {
    const expected = fixture_of_x_token_exchange_result();
    mockActor.exchange_x_token.mockResolvedValue({ Ok: expected });

    const result = await exchangeXToken("valid_code");

    expect(result.access_token).toBe("access_tok_abc");
    expect(result.profile.username).toBe("testuser");
  });

  it("it_should_call_exchange_x_token_with_the_provided_code", async () => {
    mockActor.exchange_x_token.mockResolvedValue({
      Ok: fixture_of_x_token_exchange_result(),
    });

    await exchangeXToken("my_auth_code");

    expect(mockActor.exchange_x_token).toHaveBeenCalledWith("my_auth_code");
  });
});
