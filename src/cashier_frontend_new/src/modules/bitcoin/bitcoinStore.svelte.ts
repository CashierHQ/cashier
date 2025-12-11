import { managedState } from "$lib/managedState";
import { icpLedgerService } from "$modules/token/services/icpLedger";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import { DOG_LEDGER_CANISTER_ID, OMNITY_ROUTER_CANISTER_ID } from "./constants";
import { omnityExecutionService } from "./services/omnityExecution";
import { omnityHubService } from "./services/omnityHub";
import type { OmnityRuneToken } from "./types";

export class BitcoinStore {
  readonly #tokenListQuery;
  readonly #dogLedgerCanister;

  constructor() {
    this.#tokenListQuery = managedState<OmnityRuneToken[]>({
      queryFn: async () => {
        return omnityHubService.getTokenList();
      },
      persistedKey: ["bitcoin", "tokenList"],
      storageType: "localStorage",
    });

    this.#dogLedgerCanister = new IcrcLedgerService({
      name: "Dog Ledger",
      symbol: "DOG",
      decimals: 5,
      enabled: true,
      is_default: false,
      address: DOG_LEDGER_CANISTER_ID,
      fee: BigInt(100000),
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

  async exportRunes(
    receiver: string,
    runeId: string,
    amount: bigint,
    redeemFee: bigint,
  ): Promise<string> {
    await icpLedgerService.approve(OMNITY_ROUTER_CANISTER_ID, redeemFee);

    await this.#dogLedgerCanister.approve(OMNITY_ROUTER_CANISTER_ID, amount);

    const ticketId = await omnityExecutionService.generateTicketV2(
      receiver,
      runeId,
      amount,
    );

    return ticketId;
  }
}

export const bitcoinStore = new BitcoinStore();
