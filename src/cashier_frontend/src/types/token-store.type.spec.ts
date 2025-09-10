// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { mapStringToTokenId, mapTokenIdToString } from "./token-store.type";
import { TokenId } from "../generated/token_storage/token_storage.did";
import { Principal } from "@dfinity/principal";

describe("TokenId type conversion", () => {
  it("should get a TokenId from a string", () => {
    expect(mapStringToTokenId("IC:x5qut-viaaa-aaaar-qajda-cai", "IC")).toEqual({
      IC: { ledger_id: Principal.fromText("x5qut-viaaa-aaaar-qajda-cai") },
    });
  });

  it("should get a String from a TokenId", () => {
    const token: TokenId = {
      IC: { ledger_id: Principal.fromText("x5qut-viaaa-aaaar-qajda-cai") },
    };
    expect(mapTokenIdToString(token)).toEqual("IC:x5qut-viaaa-aaaar-qajda-cai");
  });

  it("test TokenId to String roundtrip", () => {
    const tokenInput: TokenId = {
      IC: { ledger_id: Principal.fromText("x5qut-viaaa-aaaar-qajda-cai") },
    };
    const tokenOutput = mapStringToTokenId(
      mapTokenIdToString(tokenInput),
      "IC",
    );
    expect(tokenOutput).toEqual(tokenInput);
  });
});
