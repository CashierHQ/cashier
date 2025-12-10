import { managedState } from "$lib/managedState";
import { omnityHubService } from "./services/omnityHub";
import type { OmnityRuneToken } from "./types";

export class BitcoinStore {
  readonly #tokenListQuery;
  constructor() {
    this.#tokenListQuery = managedState<OmnityRuneToken[]>({
      queryFn: async () => {
        return omnityHubService.getTokenList();
      },
      persistedKey: ["bitcoin", "tokenList"],
      storageType: "localStorage",
    });
  }

  get query() {
    return this.#tokenListQuery;
  }

  async getBtcAddress(principalId: string): Promise<string> {
    return await omnityHubService.getBitcoinAddress(principalId);
  }

  async generateTicket(
    txid: string,
    principalId: string,
    amount: bigint,
    runeId: string,
  ) {
    return await omnityHubService.generateTicket(
      txid,
      principalId,
      amount,
      runeId,
    );
  }
}

export const bitcoinStore = new BitcoinStore();
