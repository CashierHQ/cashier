import { authState } from "$modules/auth/state/auth.svelte";
import type { NftSource } from "$modules/transactionCart/types/transactionSource";
import { ExtService } from "$modules/wallet/services/extService";
import { Icrc7Service } from "$modules/wallet/services/icrc7Service";
import { ReceiveAddressType } from "$modules/wallet/types";
import { Err, type Result } from "ts-results-es";

export type NftTransferState = "IDLE" | "PROCESSING" | "SUCCESS" | "FAILED";

/**
 * Transaction cart store for direct NFT transfers.
 */
export class NftTxCartStore {
  #source: NftSource;
  state = $state<NftTransferState>("IDLE");

  constructor(source: NftSource) {
    this.#source = source;
  }

  updateSource(newSource: NftSource): void {
    this.#source = newSource;
  }

  async execute(): Promise<Result<bigint, string>> {
    if (!authState.account?.owner) {
      return Err("User is not authenticated.");
    }

    this.state = "PROCESSING";

    try {
      const result = await this.#executeTransfer();
      this.state = result.isOk() ? "SUCCESS" : "FAILED";
      return result;
    } catch (e) {
      this.state = "FAILED";
      return Err((e as Error).message);
    }
  }

  async #executeTransfer(): Promise<Result<bigint, string>> {
    const { nft, collectionStandard, to, receiveType } = this.#source;
    const standard = (nft.standard ?? collectionStandard ?? "")
      .trim()
      .toUpperCase();

    if (standard === "EXT") {
      if (receiveType === ReceiveAddressType.ACCOUNT_ID) {
        if (typeof to !== "string") {
          return Err("Invalid account identifier.");
        }
        return new ExtService(nft.collectionId).transfer(nft.tokenId, {
          address: to,
        });
      }

      if (typeof to === "string") {
        return Err("Invalid principal address.");
      }
      return new ExtService(nft.collectionId).transfer(nft.tokenId, {
        principal: to,
      });
    }

    if (standard === "ICRC-7" || standard === "ICRC7") {
      if (receiveType !== ReceiveAddressType.PRINCIPAL) {
        return Err("ICRC-7 transfers only support principal addresses.");
      }
      if (typeof to === "string") {
        return Err("Invalid principal address.");
      }
      return new Icrc7Service(nft.collectionId).transfer(nft.tokenId, to);
    }

    return Err("Sending is not yet supported for this NFT standard.");
  }
}
