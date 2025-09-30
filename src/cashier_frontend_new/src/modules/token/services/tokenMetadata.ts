import { authState } from "$modules/auth/state/auth.svelte";
import {
  IcrcLedgerCanister,
  mapTokenMetadata,
  type IcrcTokenMetadata,
} from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";

/**
 * Service for fetching metadata for ICRC-* tokens
 */
class TokenMetadataService {
  public async getTokenMetadata(
    tokenAddres: string,
  ): Promise<IcrcTokenMetadata | undefined> {
    const agent = authState.anonAgent;
    const ledger = IcrcLedgerCanister.create({
      agent,
      canisterId: Principal.fromText(tokenAddres),
    });
    const data = await ledger.metadata({});
    const result = mapTokenMetadata(data);
    return result;
  }

  public async getTokenMetadataBatch(
    tokenAddresses: [string],
  ): Promise<Record<string, IcrcTokenMetadata | undefined>> {
    const agent = authState.anonAgent;
    const requests = tokenAddresses.map((tokenAddress) => {
      const ledger = IcrcLedgerCanister.create({
        agent,
        canisterId: Principal.fromText(tokenAddress),
      });
      return ledger
        .metadata({})
        .then(
          (response) => [tokenAddress, mapTokenMetadata(response)] as const,
        );
    });
    const responses = await Promise.all(requests);

    return Object.fromEntries(responses);
  }
}

export const tokenMetadataService = new TokenMetadataService();
