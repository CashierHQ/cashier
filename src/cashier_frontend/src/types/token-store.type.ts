// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import {
  Chain as BackendChain,
  TokenDto,
  TokenId,
} from "../generated/token_storage/token_storage.did";
import { TokenModel } from "@/types/fungible-token.speculative";
import { Chain } from "@/services/types/link.service.types";
import { IC_EXPLORER_IMAGES_PATH } from "@/const";
import { Principal } from "@dfinity/principal";

export interface TokenFilters {
  hideZeroBalance: boolean;
  hideUnknownToken: boolean;
  selectedChain: string[];
}

const mapStringToFrontendChain = (chain: BackendChain): Chain => {
  if ("IC" in chain) {
    return Chain.IC;
  }

  throw new Error(`Unsupported chain: ${chain}`);
};

export const mapTokenIdToString = (tokenId: TokenId): string => {
  if ("IC" in tokenId) {
    return "IC:" + tokenId.IC.ledger_id.toString();
  }

  throw new Error(`Unsupported tokenId: ${tokenId}`);
};

export const mapStringToTokenId = (tokenId: string, chain: string): TokenId => {
  const prefix = `${chain}:`;
  if (tokenId.startsWith(prefix)) {
    tokenId = tokenId.slice(prefix.length);
  }
  if (chain === "IC") {
    return { IC: { ledger_id: Principal.fromText(tokenId) } };
  }
  throw new Error(`Unsupported tokenId: ${tokenId}`);
};

// Helper function to map UserToken to FungibleToken
export const mapTokenDtoToTokenModel = (token: TokenDto): TokenModel => {
  const tokenId = token.details.IC.ledger_id?.toString() || "";

  let enable = false;
  if ("enabled" in token) {
    enable = token.enabled;
  }

  return {
    id: mapTokenIdToString(token.id),
    address: tokenId,
    chain: mapStringToFrontendChain(token.chain),
    name: token.name?.toString() || "Unknown Token",
    symbol: token.symbol?.toString() || "???",
    logo: `${IC_EXPLORER_IMAGES_PATH}${tokenId}`, // Would need to be populated from elsewhere
    decimals: token.decimals || 8,
    enabled: enable,
    fee: token.details.IC.fee,
  };
};
