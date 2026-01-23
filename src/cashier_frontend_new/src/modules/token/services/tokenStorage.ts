import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  BitcoinTransactionMapper,
  type BitcoinBlock,
  type BitcoinTransaction,
} from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeTransactionMapper,
  BridgeTransactionStatus,
  type BridgeTransaction,
} from "$modules/bitcoin/types/bridge_transaction";
import { TOKEN_STORAGE_CANISTER_ID } from "$modules/shared/constants";
import {
  validateIndexCanister,
  validateLedgerCanister,
  ValidationError,
  type ValidationErrorType,
} from "$modules/token/services/canisterValidation";
import type { TokenMetadata } from "$modules/token/types";
import { parseListTokens } from "$modules/token/utils/parser";
import type { NFT } from "$modules/wallet/types/nft";
import { NFTMapper } from "$modules/wallet/types/nft";
import { Principal } from "@dfinity/principal";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Service for interacting with the Token Storage canister
 * This service facilitates querying the list of user tokens.
 */
class TokenStorageService {
  /**
   * Get the authenticated Token Storage actor for the current user.
   * @returns The authenticated Token Storage actor.
   * @throws Error if the user is not authenticated
   */
  #getActor(): tokenStorage._SERVICE | null {
    return authState.buildActor({
      canisterId: TOKEN_STORAGE_CANISTER_ID,
      idlFactory: tokenStorage.idlFactory,
    });
  }

  /**
   * Get the list of user tokens from the Token Storage canister.
   * @returns List of user tokens.
   * @throws Error if fetching fails.
   */
  public async listTokens(): Promise<TokenMetadata[]> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res: tokenStorage.Result_5 = await actor.list_tokens();
    return parseListTokens(res);
  }

  /**
   * Toggle the enabled state of a token.
   * @param address The principal address of the token to toggle.
   * @param is_enabled The new enabled state of the token.
   */
  public async toggleToken(
    address: Principal,
    is_enabled: boolean,
  ): Promise<void> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res = await actor.user_update_token_enable({
      token_id: { IC: { ledger_id: address } },
      is_enabled,
    });
    if ("Err" in res) {
      throw new Error(`Error updating token: ${res.Err}`);
    }
  }

  /**
   * Add a new token to the user wallet with validation
   * @param address The principal address of the token to add.
   * @param indexId Optional index canister ID for the token.
   * @param existingTokens List of existing token addresses for duplicate check.
   * @returns Result with void on success or ValidationError on failure.
   */
  public async addToken(
    address: Principal,
    indexId?: string,
    existingTokens?: string[],
  ): Promise<Result<void, ValidationErrorType>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err(ValidationError.BACKEND_ERROR);
    }

    const addressStr = address.toText();

    // 1. Check if token already exists
    if (existingTokens?.includes(addressStr)) {
      return Err(ValidationError.TOKEN_EXISTS);
    }

    // 2. Validate ledger canister
    const ledgerResult = await validateLedgerCanister(addressStr);
    if (ledgerResult.isErr()) {
      return Err(ValidationError.INVALID_LEDGER);
    }

    // 3. Validate index canister if provided - must match ledger
    if (indexId) {
      const indexResult = await validateIndexCanister(indexId, addressStr);
      if (indexResult.isErr()) {
        return Err(indexResult.error);
      }
    }

    // 4. Call backend
    try {
      const res = await actor.user_add_token({
        token_id: { IC: { ledger_id: address } },
        index_id: indexId ? [indexId] : [],
      });

      if ("Err" in res) {
        return Err(ValidationError.BACKEND_ERROR);
      }

      return Ok(undefined);
    } catch {
      return Err(ValidationError.BACKEND_ERROR);
    }
  }

  /**
   * Get the NFTs owned by the user with pagination
   * @param start the starting index
   * @param limit the maximum number of NFTs to retrieve
   * @returns List of NFTs owned by the user
   */
  public async getNfts(start: number, limit: number): Promise<NFT[]> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res = await actor.user_get_nfts({
      start: [start],
      limit: [limit],
    });

    return res.map((nft) => NFTMapper.fromTokenStorageNft(nft));
  }

  /**
   * Add a new NFT to the user's collection
   * @param collectionAddress the canister Id of the NFT collection
   * @param tokenId the token ID of the NFT
   * @returns Result with void on success or error message on failure
   */
  public async addNft(
    collectionAddress: Principal,
    tokenId: bigint,
  ): Promise<Result<void, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      await actor.user_add_nft({
        nft: {
          collection_id: collectionAddress,
          token_id: tokenId,
        },
      });
      return Ok(undefined);
    } catch (err) {
      return Err(`Error adding NFT: ${err}`);
    }
  }

  /**
   * Get the BTC address associated with the user's wallet
   * @returns BTC address on success or error message on failure
   */
  public async getBtcAddress(): Promise<Result<string, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const res = await actor.user_get_btc_address();
      if ("Ok" in res) {
        return Ok(res.Ok);
      } else {
        return Err(`Error fetching BTC address: ${res.Err}`);
      }
    } catch (err) {
      return Err(`Error fetching BTC address: ${err}`);
    }
  }

  /**
   * Create a bridge transaction to import BTC into ICP
   * @param senderBtcAddress The BTC address of the sender
   * @param receiverBtcAddress The BTC address of the receiver
   * @param bitcoinTransaction The Bitcoin transaction details
   * @param depositFee The deposit fee in satoshis
   * @param withdrawalFee The withdrawal fee in satoshis
   * @param isImporting Flag indicating if the transaction is for importing BTC
   * @returns BridgeTransaction or error message
   */
  public async createBridgeTransaction(
    senderBtcAddress: string,
    receiverBtcAddress: string,
    bitcoinTransaction: BitcoinTransaction,
    depositFee: bigint,
    withdrawalFee: bigint,
    isImporting: boolean,
  ): Promise<Result<BridgeTransaction, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const inputArgs =
        BitcoinTransactionMapper.toCreateBridgeTransactionRequest(
          authState.account?.owner || "",
          senderBtcAddress,
          receiverBtcAddress,
          bitcoinTransaction,
          depositFee,
          withdrawalFee,
          isImporting,
        );
      const res = await actor.user_create_bridge_transaction(inputArgs);

      if ("Ok" in res) {
        const useBridgeTransactionDto = res.Ok;
        const bridgeTransaction =
          BridgeTransactionMapper.fromTokenStorageBridgeTransaction(
            useBridgeTransactionDto,
          );
        return Ok(bridgeTransaction);
      } else {
        return Err(`Error creating bridge transaction: ${res.Err}`);
      }
    } catch (err) {
      return Err(`Error creating bridge transaction: ${err}`);
    }
  }

  /**
   * Get bridge transactions with pagination
   * @param start The starting index for pagination
   * @param limit The maximum number of transactions to retrieve
   * @param status Optional status filter
   * @returns array of bridge transactions or error message
   */
  public async getBridgeTransactions(
    start: number,
    limit: number,
    status: BridgeTransactionStatus | null = null,
  ): Promise<BridgeTransaction[]> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    try {
      const res = await actor.user_get_bridge_transactions({
        start: [start],
        limit: [limit],
        status: status
          ? [BridgeTransactionMapper.toBridgeTransactionStatusCanister(status)]
          : [],
      });

      const bridgeTransactions = res.map((tx) =>
        BridgeTransactionMapper.fromTokenStorageBridgeTransaction(tx),
      );
      return bridgeTransactions;
    } catch (err) {
      throw new Error(`Error fetching bridge transactions: ${err}`);
    }
  }

  /**
   * Get bridge transaction by its ID
   * @param bridgeId
   * @returns Bridge transaction or null if not found
   */
  public async getBridgeTransactionById(
    bridgeId: string,
  ): Promise<Result<BridgeTransaction | null, string>> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    try {
      const res = await actor.user_get_bridge_transaction_by_id(bridgeId);

      if (res.length === 0) {
        return Ok(null);
      }

      const bridgeTransaction =
        BridgeTransactionMapper.fromTokenStorageBridgeTransaction(res[0]);
      return Ok(bridgeTransaction);
    } catch (err) {
      return Err(`Error fetching bridge transaction by ID: ${err}`);
    }
  }

  /**
   * Update a bridge transaction's details
   * @param bridgeId the bridge transaction ID
   * @param status the new status of the bridge transaction
   * @param block_id the block ID where the transaction was confirmed
   * @param block_timestamp the timestamp of the block where the transaction was confirmed
   * @param confirmations list of Bitcoin blocks confirming the transaction
   * @param btc_txid the Bitcoin transaction ID
   * @param deposit_fee ckBTC deposit fee
   * @param withdrawal_fee ckBTC withdrawal fee
   * @param retry_times number of retry attempts for updating balance
   * @returns updated BridgeTransaction or error message
   */
  public async updateBridgeTransaction(
    bridgeId: string,
    status: BridgeTransactionStatus,
    block_id: bigint | null = null,
    block_timestamp: bigint | null = null,
    confirmations: BitcoinBlock[] = [],
    btc_txid: string | null = null,
    deposit_fee: bigint | null = null,
    withdrawal_fee: bigint | null = null,
    retry_times: number | null = null,
  ): Promise<Result<BridgeTransaction, string>> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    try {
      const updateArgs = BridgeTransactionMapper.toUpdateBridgeTransactionArgs(
        bridgeId,
        status,
        block_id,
        block_timestamp,
        confirmations,
        btc_txid,
        deposit_fee,
        withdrawal_fee,
        retry_times,
      );

      console.log("updateBridgeTransaction args:", updateArgs);
      const res = await actor.user_update_bridge_transaction(updateArgs);
      console.log("updateBridgeTransaction result:", res);

      if ("Ok" in res) {
        const useBridgeTransactionDto = res.Ok;
        const bridgeTransaction =
          BridgeTransactionMapper.fromTokenStorageBridgeTransaction(
            useBridgeTransactionDto,
          );
        return Ok(bridgeTransaction);
      } else {
        return Err(`Error updating bridge transaction: ${res.Err}`);
      }
    } catch (err) {
      return Err(`Error updating bridge transaction: ${err}`);
    }
  }
}

export const tokenStorageService = new TokenStorageService();
