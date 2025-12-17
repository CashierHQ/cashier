import { ManagedState, managedState } from "$lib/managedState/managedState.svelte";
import { TokenHistoryService } from "../services/tokenHistory";
import type { TokenTransaction, IcrcAccount } from "../types";

/**
 * Create managed state for token transaction history
 * @param indexId Index canister principal
 * @param account User account to query
 * @param options Optional config (staleTime, maxResults)
 */
export function tokenHistoryQuery(
  indexId: string,
  account: IcrcAccount,
  options?: { staleTime?: number; maxResults?: bigint },
): ManagedState<TokenTransaction[]> {
  const service = new TokenHistoryService(indexId);

  return managedState({
    queryFn: async () => {
      const result = await service.getTransactions({
        account,
        maxResults: options?.maxResults ?? BigInt(50),
      });
      return result.transactions;
    },
    staleTime: options?.staleTime ?? 60_000,
  });
}
