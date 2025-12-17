// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Principal } from "@dfinity/principal";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  linkAssetBalanceService,
  linkIdToSubaccount,
} from "./linkAssetBalance.service";

// Mock authState
const mocks = vi.hoisted(() => ({
  authState: {
    buildAnonymousAgent: vi.fn(),
  },
  IcrcLedgerCanister: {
    create: vi.fn(),
  },
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: mocks.authState,
}));

vi.mock("@dfinity/ledger-icrc", () => ({
  IcrcLedgerCanister: mocks.IcrcLedgerCanister,
}));

vi.mock("$modules/shared/constants", () => ({
  CASHIER_BACKEND_CANISTER_ID: "aaaaa-aa",
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("linkIdToSubaccount", () => {
  it("should convert UUID to 32-byte subaccount", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = linkIdToSubaccount(uuid);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
    // First 16 bytes should be the UUID bytes, rest should be 0
    expect(result.slice(16).every((b) => b === 0)).toBe(true);
  });

  it("should produce consistent output for same UUID", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result1 = linkIdToSubaccount(uuid);
    const result2 = linkIdToSubaccount(uuid);

    expect(result1).toEqual(result2);
  });
});

describe("LinkAssetBalanceService.fetchAssetBalances", () => {
  it("should return empty array when linkId is empty", async () => {
    const result = await linkAssetBalanceService.fetchAssetBalances("", [
      "ryjl3-tyaaa-aaaaa-aaaba-cai",
    ]);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual([]);
  });

  it("should return empty array when assetAddresses is empty", async () => {
    const result = await linkAssetBalanceService.fetchAssetBalances(
      "550e8400-e29b-41d4-a716-446655440000",
      [],
    );

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual([]);
  });

  it("should fetch balances for multiple assets", async () => {
    const mockAgent = {};
    const mockBalance = vi.fn().mockResolvedValue(BigInt(1000000));
    const mockLedger = { balance: mockBalance };

    mocks.authState.buildAnonymousAgent.mockReturnValue(mockAgent);
    mocks.IcrcLedgerCanister.create.mockReturnValue(mockLedger);

    const linkId = "550e8400-e29b-41d4-a716-446655440000";
    const addresses = [
      "ryjl3-tyaaa-aaaaa-aaaba-cai",
      "mxzaz-hqaaa-aaaar-qaada-cai",
    ];

    const result = await linkAssetBalanceService.fetchAssetBalances(
      linkId,
      addresses,
    );

    expect(result.isOk()).toBe(true);
    const balances = result.unwrap();
    expect(balances.length).toBe(2);
    expect(balances[0].balance).toBe(BigInt(1000000));
    expect(balances[0].tokenAddress.toText()).toBe(addresses[0]);
  });

  it("should return 0 balance on individual ledger failure", async () => {
    const mockAgent = {};
    const mockBalance = vi.fn().mockRejectedValue(new Error("Ledger error"));
    const mockLedger = { balance: mockBalance };

    mocks.authState.buildAnonymousAgent.mockReturnValue(mockAgent);
    mocks.IcrcLedgerCanister.create.mockReturnValue(mockLedger);

    const linkId = "550e8400-e29b-41d4-a716-446655440000";
    const addresses = ["ryjl3-tyaaa-aaaaa-aaaba-cai"];

    const result = await linkAssetBalanceService.fetchAssetBalances(
      linkId,
      addresses,
    );

    expect(result.isOk()).toBe(true);
    const balances = result.unwrap();
    expect(balances.length).toBe(1);
    expect(balances[0].balance).toBe(BigInt(0));
  });
});
