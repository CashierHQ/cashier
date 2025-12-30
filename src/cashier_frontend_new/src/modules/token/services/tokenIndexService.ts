import { authState } from "$modules/auth/state/auth.svelte";
import {
  IndexCanister,
  AccountIdentifier,
  SubAccount,
  type TransactionWithId,
  type Operation,
} from "@dfinity/ledger-icp";
import {
  IcrcIndexNgCanister,
  type IcrcIndexNgTransactionWithId,
} from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { fromNullable } from "@dfinity/utils";
import { ICP_INDEX_CANISTER_ID } from "../constants";
import {
  TransactionKind,
  type GetTransactionsParams,
  type GetTransactionsResult,
  type TokenTransaction,
  type TransactionKindValue,
} from "../types";
import { assertUnreachable } from "$lib/rsMatch";

const DEFAULT_PAGE_SIZE = 100n;

/**
 * Service to fetch transaction history from index canisters.
 * Handles both ICP (IndexCanister) and ICRC (IcrcIndexNgCanister).
 */
export class TokenIndexService {
  #canisterId: Principal;

  constructor(canisterId: Principal) {
    this.#canisterId = canisterId;
  }

  /**
   * Fetch transactions from index canister
   */
  async getTransactions(
    params: GetTransactionsParams,
  ): Promise<GetTransactionsResult> {
    const isIcp = this.#canisterId.toText() === ICP_INDEX_CANISTER_ID;

    if (isIcp) {
      return this.getIcpTransactions(params);
    }
    return this.getIcrcTransactions(params);
  }

  /**
   * ICP Index Canister (uses AccountIdentifier)
   */
  async getIcpTransactions(
    params: GetTransactionsParams,
  ): Promise<GetTransactionsResult> {
    const agent = authState.buildAnonymousAgent();

    const indexCanister = IndexCanister.create({
      agent,
      canisterId: this.#canisterId,
    });

    // Convert principal to ICP account identifier
    const principal = Principal.fromText(params.account.owner);
    const subAccount = params.account.subaccount
      ? SubAccount.fromBytes(params.account.subaccount)
      : undefined;
    const accountIdentifier = AccountIdentifier.fromPrincipal({
      principal,
      subAccount: subAccount instanceof Error ? undefined : subAccount,
    });

    const response = await indexCanister.getTransactions({
      certified: false, // Query call for speed
      accountIdentifier: accountIdentifier.toHex(),
      start: params.start,
      maxResults: params.maxResults ?? DEFAULT_PAGE_SIZE,
    });

    return {
      transactions: response.transactions.map((tx) =>
        this.mapIcpTransaction(tx),
      ),
      balance: response.balance,
      oldestTxId: fromNullable(response.oldest_tx_id),
    };
  }

  /**
   * ICRC Index-NG Canister (uses Principal + subaccount)
   */
  async getIcrcTransactions(
    params: GetTransactionsParams,
  ): Promise<GetTransactionsResult> {
    const agent = authState.buildAnonymousAgent();

    const indexCanister = IcrcIndexNgCanister.create({
      agent,
      canisterId: this.#canisterId,
    });

    const response = await indexCanister.getTransactions({
      certified: false,
      account: {
        owner: Principal.fromText(params.account.owner),
        subaccount: params.account.subaccount,
      },
      start: params.start,
      max_results: params.maxResults ?? DEFAULT_PAGE_SIZE,
    });

    return {
      transactions: response.transactions.map((tx) =>
        this.mapIcrcTransaction(tx),
      ),
      balance: response.balance,
      oldestTxId: fromNullable(response.oldest_tx_id),
    };
  }

  /**
   * Map ICP TransactionWithId to unified TokenTransaction type
   * ICP uses Operation union type: { Transfer: {...} } | { Mint: {...} } | etc.
   */
  mapIcpTransaction(tx: TransactionWithId): TokenTransaction {
    const { id, transaction } = tx;
    const operation = transaction.operation;

    // Extract kind and operation data from discriminated union
    const kind = this.getIcpOperationKind(operation);
    const opData = this.getIcpOperationData(operation);

    // ICP timestamp: try timestamp first, fallback to created_at_time
    const timestampNanos =
      fromNullable(transaction.timestamp)?.timestamp_nanos ??
      fromNullable(transaction.created_at_time)?.timestamp_nanos ??
      0n;
    const timestampMs = Number(timestampNanos / 1_000_000n);

    return {
      id,
      kind,
      amount: opData.amount?.e8s ?? 0n,
      fee: opData.fee?.e8s,
      timestampMs,
      from: opData.from,
      to: opData.to,
      spender: opData.spender,
      memo: fromNullable(transaction.icrc1_memo) as Uint8Array | undefined,
    };
  }

  /**
   * Extract kind from ICP Operation union type
   */
  getIcpOperationKind(operation: Operation): TransactionKindValue {
    if ("Transfer" in operation) return TransactionKind.TRANSFER;
    if ("Mint" in operation) return TransactionKind.MINT;
    if ("Burn" in operation) return TransactionKind.BURN;
    if ("Approve" in operation) return TransactionKind.APPROVE;

    assertUnreachable(operation);
  }

  /**
   * Extract operation data from ICP Operation union type
   * Note: Transfer and Burn have optional spender field ([] | [string]) for transferFrom
   */
  getIcpOperationData(operation: Operation): {
    amount?: { e8s: bigint };
    fee?: { e8s: bigint };
    from?: string;
    to?: string;
    spender?: string;
  } {
    if ("Transfer" in operation) {
      return {
        amount: operation.Transfer.amount,
        fee: operation.Transfer.fee,
        from: operation.Transfer.from,
        to: operation.Transfer.to,
        spender: fromNullable(operation.Transfer.spender),
      };
    }
    if ("Mint" in operation) {
      return {
        amount: operation.Mint.amount,
        to: operation.Mint.to,
      };
    }
    if ("Burn" in operation) {
      return {
        amount: operation.Burn.amount,
        from: operation.Burn.from,
        spender: fromNullable(operation.Burn.spender),
      };
    }
    if ("Approve" in operation) {
      return {
        amount: operation.Approve.allowance,
        fee: operation.Approve.fee,
        from: operation.Approve.from,
      };
    }
    assertUnreachable(operation);
  }

  /**
   * Map ICRC kind string to unified TransactionKindValue
   * ICRC canisters may use various kind formats: "xfer", "transfer", "icrc1_transfer", etc.
   */
  getIcrcKind(icrcKind: string): TransactionKindValue {
    const lowerKind = icrcKind.toLowerCase();
    switch (lowerKind) {
      case "transfer":
      case "xfer":
      case "icrc1_transfer":
        return TransactionKind.TRANSFER;
      case "mint":
      case "icrc1_mint":
        return TransactionKind.MINT;
      case "burn":
      case "icrc1_burn":
        return TransactionKind.BURN;
      case "approve":
      case "icrc1_approve":
        return TransactionKind.APPROVE;
      default:
        assertUnreachable(lowerKind as never);
    }
  }

  /**
   * Map ICRC IcrcIndexNgTransactionWithId to unified TokenTransaction type
   * ICRC uses optional fields: { transfer?: [...], mint?: [...], burn?: [...], approve?: [...] }
   */
  mapIcrcTransaction(tx: IcrcIndexNgTransactionWithId): TokenTransaction {
    const { id, transaction } = tx;
    const kind = this.getIcrcKind(transaction.kind);

    // Extract from optional array fields using fromNullable
    const transfer = fromNullable(transaction.transfer);
    const mint = fromNullable(transaction.mint);
    const burn = fromNullable(transaction.burn);
    const approve = fromNullable(transaction.approve);

    // ICRC timestamp: get from created_at_time of operation, fallback to transaction.timestamp
    const createdAtTime =
      (transfer?.created_at_time && fromNullable(transfer.created_at_time)) ??
      (mint?.created_at_time && fromNullable(mint.created_at_time)) ??
      (burn?.created_at_time && fromNullable(burn.created_at_time)) ??
      (approve?.created_at_time && fromNullable(approve.created_at_time)) ??
      transaction.timestamp;
    const timestampMs = Number(createdAtTime / 1_000_000n);

    // Extract spender for transferFrom (ICRC-2)
    const spenderAccount = transfer?.spender && fromNullable(transfer.spender);

    return {
      id,
      kind,
      amount:
        transfer?.amount ??
        mint?.amount ??
        burn?.amount ??
        approve?.amount ??
        0n,
      fee:
        (transfer?.fee && fromNullable(transfer.fee)) ??
        (approve?.fee && fromNullable(approve.fee)),
      timestampMs,
      from:
        transfer?.from?.owner?.toText() ??
        burn?.from?.owner?.toText() ??
        approve?.from?.owner?.toText(),
      to: transfer?.to?.owner?.toText() ?? mint?.to?.owner?.toText(),
      spender: spenderAccount?.owner?.toText(),
      memo: ((transfer?.memo && fromNullable(transfer.memo)) ??
        (mint?.memo && fromNullable(mint.memo)) ??
        (burn?.memo && fromNullable(burn.memo)) ??
        (approve?.memo && fromNullable(approve.memo))) as
        | Uint8Array
        | undefined,
    };
  }
}
