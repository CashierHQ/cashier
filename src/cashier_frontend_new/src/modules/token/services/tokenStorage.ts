import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  BitcoinTransactionMapper,
  type BitcoinBlock,
  type BitcoinTransaction,
} from "$modules/bitcoin/types/bitcoin_transaction";
import {
  type BridgeAssetTypeValue,
  type BridgeAssetInfo,
  BridgeTransactionMapper,
  BridgeTransactionStatus,
  type BridgeTransaction,
  type BridgeTypeValue,
  type BridgeUtxo,
} from "$modules/bitcoin/types/bridge_transaction";
import { TOKEN_STORAGE_CANISTER_ID } from "$modules/shared/constants";
import {
  validateIndexCanister,
  validateLedgerCanister,
  ValidationError,
  type ValidationErrorType,
} from "$modules/token/services/canisterValidation";
import type { TokenMetadata } from "$modules/token/types";
import { parseListTokens, parseTokenDto } from "$modules/token/utils/parser";
import type { NFT } from "$modules/wallet/types/nft";
import { NFTMapper } from "$modules/wallet/types/nft";
import { Principal } from "@icp-sdk/core/principal";
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
   * Get the anonymous Token Storage actor (no authentication required).
   * Used for public read-only queries on the token registry.
   */
  #getAnonymousActor(): tokenStorage._SERVICE {
    return authState.buildActor({
      canisterId: TOKEN_STORAGE_CANISTER_ID,
      idlFactory: tokenStorage.idlFactory,
      options: { anonymous: true },
    }) as tokenStorage._SERVICE;
  }

  /**
   * Get a single token's metadata from the registry by its canister address.
   * Uses an anonymous actor so it works without user authentication.
   * @param address Canister ID of the token ledger
   * @returns TokenMetadata if found, null otherwise
   */
  public async getTokenById(address: Principal): Promise<TokenMetadata | null> {
    const actor = this.#getAnonymousActor();
    const res = await actor.get_token_by_id(address);
    if ("Err" in res) return null;
    return parseTokenDto(res.Ok);
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
    const res: tokenStorage.Result_8 = await actor.list_tokens();
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
   * @param isRune Whether the token is a Bitcoin Rune bridged via Omnity.
   * @param runeId The Rune ID (e.g. UNCOMMON•GOODS), required when isRune is true.
   * @param runeTokenId The Omnity token identifier, required when isRune is true.
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
        is_rune: [],
        rune_info: [],
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

    return res.map((nft: tokenStorage.Nft) =>
      NFTMapper.fromTokenStorageNft(nft),
    );
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
        return Err(`Error fetching BTC address: ${JSON.stringify(res.Err)}`);
      }
    } catch (err) {
      return Err(`Error fetching BTC address: ${err}`);
    }
  }

  /**
   * Get the Rune deposit address associated with the user's wallet.
   * @returns Rune address on success or error message on failure
   */
  public async getRuneAddress(): Promise<Result<string, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const res = await actor.user_get_rune_address();
      if ("Ok" in res) {
        return Ok(res.Ok);
      } else {
        return Err(`Error fetching Rune address: ${JSON.stringify(res.Err)}`);
      }
    } catch (err) {
      return Err(`Error fetching Rune address: ${err}`);
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
  public async createImportBridgeTransaction(
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
        return Err(
          `Error creating bridge transaction: ${JSON.stringify(res.Err)}`,
        );
      }
    } catch (err) {
      return Err(`Error creating bridge transaction: ${err}`);
    }
  }

  /**
   * Create an import bridge transaction for the manual refresh flow.
   * The bridge is identified by the ckBTC ledger block index from the minted
   * UTXO and created as Completed, with the BTC txid populated from the UTXO.
   * Block confirmations should be set via updateBridgeTransaction after creation.
   * @param btcAddress The user's BTC deposit address
   * @param mintedAmount The amount of ckBTC minted (in satoshis)
   * @param ckbtcBlockId The ckBTC ledger block index of the mint transaction
   * @param depositFee The deposit fee in satoshis
   * @param btcTxid The hex-encoded Bitcoin transaction ID of the minted UTXO
   * @returns BridgeTransaction or error message
   */
  public async createManualImportBridgeTransaction(
    btcAddress: string,
    mintedAmount: bigint,
    ckbtcBlockId: bigint,
    depositFee: bigint,
    btcTxid: string,
  ): Promise<Result<BridgeTransaction, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const inputArgs: tokenStorage.CreateBridgeTransactionInputArg = {
        vin: [],
        btc_txid: [btcTxid],
        icp_address: Principal.fromText(authState.account?.owner || ""),
        btc_address: btcAddress,
        asset_infos: [
          {
            asset_type: { BTC: null },
            asset_id: "UTXO",
            amount: mintedAmount,
            decimals: 8,
          },
        ],
        bridge_type: { Import: null },
        vout: [],
        deposit_fee_btc_sats: [depositFee],
        withdrawal_fee_btc_sats: [],
        withdrawal_fee_icp_e8s: [],
        btc_fee: [],
        created_at_ts: BigInt(Math.floor(Date.now() / 1000)),
        ckbtc_block_id: [ckbtcBlockId],
        status: [{ Completed: null }],
        omnity_ticket_id: [],
      };

      const res = await actor.user_create_bridge_transaction(inputArgs);
      if ("Ok" in res) {
        const bridgeTransaction =
          BridgeTransactionMapper.fromTokenStorageBridgeTransaction(res.Ok);
        return Ok(bridgeTransaction);
      }

      return Err(
        `Error creating manual import bridge transaction: ${JSON.stringify(res.Err)}`,
      );
    } catch (err) {
      return Err(`Error creating manual import bridge transaction: ${err}`);
    }
  }

  /**
   * Create an export bridge transaction to withdraw BTC from ckBTC on ICP
   * @param receiverBtcAddress The BTC address of the receiver
   * @param amount The amount of BTC to withdraw
   * @param withdrawalFee The withdrawal fee in satoshis
   * @param btcFee The BTC network fee in satoshis
   * @returns BridgeTransaction or error message
   */
  public async createExportBridgeTransaction(
    receiverBtcAddress: string,
    amount: bigint,
    withdrawalFee: bigint,
    btcFee: bigint,
  ): Promise<Result<BridgeTransaction, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const inputArgs =
        BridgeTransactionMapper.toCreateExportBridgeTransactionArgs(
          authState.account?.owner || "",
          receiverBtcAddress,
          amount,
          withdrawalFee,
          btcFee,
        );

      const res = await actor.user_create_bridge_transaction(inputArgs);
      if ("Ok" in res) {
        const bridgeTransaction =
          BridgeTransactionMapper.fromTokenStorageBridgeTransaction(res.Ok);
        return Ok(bridgeTransaction);
      }

      return Err(
        `Error creating export bridge transaction: ${JSON.stringify(res.Err)}`,
      );
    } catch (err) {
      return Err(`Error creating export bridge transaction: ${err}`);
    }
  }

  /**
   * Create a Rune export bridge transaction
   * @param receiverBtcAddress The BTC address of the receiver
   * @param runeId The ID of the Rune being withdrawn (e.g. UNCOMMON•GOODS)
   * @param amount The amount of the Rune being withdrawn (in smallest unit, e.g. satoshis)
   * @param decimals The number of decimals for the Rune (e.g. 8 for satoshis)
   * @returns BridgeTransaction or error message
   */
  public async createRuneExportBridgeTransaction(args: {
    receiverBtcAddress: string;
    runeId: string;
    amount: bigint;
    decimals: number;
    withdrawalFee: bigint;
  }): Promise<Result<BridgeTransaction, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const inputArgs =
        BridgeTransactionMapper.toCreateRuneExportBridgeTransactionArgs(
          authState.account?.owner || "",
          args.receiverBtcAddress,
          args.runeId,
          args.amount,
          args.decimals,
          args.withdrawalFee,
        );

      const res = await actor.user_create_bridge_transaction(inputArgs);
      if ("Ok" in res) {
        return Ok(
          BridgeTransactionMapper.fromTokenStorageBridgeTransaction(res.Ok),
        );
      }

      return Err(
        `Error creating Rune export bridge transaction: ${JSON.stringify(res.Err)}`,
      );
    } catch (err) {
      return Err(`Error creating Rune export bridge transaction: ${err}`);
    }
  }

  /**
   * Create a Rune import bridge transaction
   * @param btcAddress The user's BTC deposit address
   * @param runeId The ID of the Rune being deposited (e.g. UNCOMMON•GOODS)
   * @param amount The amount of the Rune being deposited (in smallest unit, e.g. satoshis)
   * @param decimals The number of decimals for the Rune (e.g. 8 for satoshis)
   * @param btcTxid The hex-encoded Bitcoin transaction ID of the Rune deposit
   * @param vin Optional list of UTXOs used as inputs for the deposit transaction, required if the transaction has more than 1 input
   * @param vout Optional list of UTXOs used as outputs for the deposit transaction, required if the transaction has more than 1 output
   * @returns BridgeTransaction or error message
   */
  public async createRuneImportBridgeTransaction(args: {
    btcAddress: string;
    runeId: string;
    amount: bigint;
    decimals: number;
    btcTxid: string;
    status?: BridgeTransactionStatus;
    omnity_ticket_id?: string;
    vin?: BridgeUtxo[];
    vout?: BridgeUtxo[];
  }): Promise<Result<BridgeTransaction, string>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err("User is not authenticated");
    }

    try {
      const inputArgs: tokenStorage.CreateBridgeTransactionInputArg = {
        vin: args.vin && args.vin.length > 0 ? [args.vin] : [],
        btc_txid: [args.btcTxid],
        icp_address: Principal.fromText(authState.account?.owner || ""),
        btc_address: args.btcAddress,
        asset_infos: [
          {
            asset_type: { Runes: null },
            asset_id: args.runeId,
            amount: args.amount,
            decimals: args.decimals,
          },
        ],
        bridge_type: { Import: null },
        vout: args.vout && args.vout.length > 0 ? [args.vout] : [],
        deposit_fee_btc_sats: [],
        withdrawal_fee_btc_sats: [],
        withdrawal_fee_icp_e8s: [],
        btc_fee: [],
        created_at_ts: BigInt(Math.floor(Date.now() / 1000)),
        ckbtc_block_id: [],
        status: args.status
          ? [
              BridgeTransactionMapper.toBridgeTransactionStatusCanister(
                args.status,
              ),
            ]
          : [],
        omnity_ticket_id: args.omnity_ticket_id ? [args.omnity_ticket_id] : [],
      };

      const res = await actor.user_create_bridge_transaction(inputArgs);
      if ("Ok" in res) {
        return Ok(
          BridgeTransactionMapper.fromTokenStorageBridgeTransaction(res.Ok),
        );
      }

      return Err(
        `Error creating Rune import bridge transaction: ${JSON.stringify(res.Err)}`,
      );
    } catch (err) {
      return Err(`Error creating Rune import bridge transaction: ${err}`);
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
    bridgeType: BridgeTypeValue | null = null,
    assetType: BridgeAssetTypeValue | null = null,
    runeId: string | null = null,
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
        bridge_type: bridgeType
          ? [BridgeTransactionMapper.toBridgeTypeCanister(bridgeType)]
          : [],
        asset_type: assetType
          ? [BridgeTransactionMapper.toBridgeAssetTypeCanister(assetType)]
          : [],
        rune_id: runeId ? [runeId] : [],
      });

      const bridgeTransactions = res.map(
        (tx: tokenStorage.UserBridgeTransactionDto) =>
          BridgeTransactionMapper.fromTokenStorageBridgeTransaction(tx),
      );

      return bridgeTransactions;
    } catch (err) {
      throw new Error(`Error fetching bridge transactions: ${err}`, {
        cause: err,
      });
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
   * @param ckbtc_block_id the ckBTC ledger burn block index for export tracking
   * @param block_id the block ID where the transaction was confirmed
   * @param block_timestamp the timestamp of the block where the transaction was confirmed
   * @param confirmations list of Bitcoin blocks confirming the transaction
   * @param btc_txid the Bitcoin transaction ID
   * @param deposit_fee_btc_sats ckBTC deposit fee in BTC satoshis
   * @param withdrawal_fee_btc_sats ckBTC withdrawal fee in BTC satoshis
   * @param withdrawal_fee_icp_e8s Rune redeem fee in ICP e8s
   * @param btc_fee Bitcoin network fee
   * @param retry_times number of retry attempts for updating balance
   * @returns updated BridgeTransaction or error message
   */
  public async updateBridgeTransaction(
    bridgeId: string,
    status: BridgeTransactionStatus | null = null,
    ckbtc_block_id: bigint | null = null,
    block_id: bigint | null = null,
    block_timestamp: bigint | null = null,
    confirmations: BitcoinBlock[] = [],
    btc_txid: string | null = null,
    deposit_fee_btc_sats: bigint | null = null,
    withdrawal_fee_btc_sats: bigint | null = null,
    withdrawal_fee_icp_e8s: bigint | null = null,
    btc_fee: bigint | null = null,
    retry_times: number | null = null,
    omnity_ticket_id: string | null = null,
    vin: BridgeUtxo[] = [],
    vout: BridgeUtxo[] = [],
    asset_infos: BridgeAssetInfo[] = [],
  ): Promise<Result<BridgeTransaction, string>> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }

    try {
      const updateArgs = BridgeTransactionMapper.toUpdateBridgeTransactionArgs(
        bridgeId,
        status,
        ckbtc_block_id,
        block_id,
        block_timestamp,
        confirmations,
        btc_txid,
        deposit_fee_btc_sats,
        withdrawal_fee_btc_sats,
        withdrawal_fee_icp_e8s,
        btc_fee,
        retry_times,
        omnity_ticket_id,
        vin,
        vout,
        asset_infos,
      );

      const res = await actor.user_update_bridge_transaction(updateArgs);

      if ("Ok" in res) {
        const useBridgeTransactionDto = res.Ok;
        const bridgeTransaction =
          BridgeTransactionMapper.fromTokenStorageBridgeTransaction(
            useBridgeTransactionDto,
          );
        return Ok(bridgeTransaction);
      } else {
        return Err(
          `Error updating bridge transaction: ${JSON.stringify(res.Err)}`,
        );
      }
    } catch (err) {
      return Err(`Error updating bridge transaction: ${err}`);
    }
  }
}

export const tokenStorageService = new TokenStorageService();
