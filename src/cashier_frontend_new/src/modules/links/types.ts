import type {
  LinkType as BackendLinkType,
  CreateLinkInput,
  LinkDetailUpdateAssetInfoInput,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable } from "$lib/rsMatch";
import { Principal } from "@dfinity/principal";
import { Result, Ok, Err } from "ts-results-es";

// Tip link details
export type TipLink = {
  asset: string;
  amount: number;
};

/** Frontend LinkType as a class with built-in mapping to backend union */
export class LinkType {
  private constructor(public readonly id: string) {}

  static readonly TIP = new LinkType("TIP");
  static readonly AIRDROP = new LinkType("AIRDROP");
  static readonly TOKEN_BASKET = new LinkType("TOKEN_BASKET");

  /**
   * Convert frontend LinkType to corresponding backend LinkType
   * @returns Corresponding BackendLinkType
   */
  toBackendType(): BackendLinkType {
    switch (this) {
      case LinkType.TIP:
        return { SendAirdrop: null };
      case LinkType.AIRDROP:
        return { SendAirdrop: null };
      case LinkType.TOKEN_BASKET:
        return { SendTokenBasket: null };
      default:
        return assertUnreachable(this as never);
    }
  }
}

/** Data required to create a new link */
export class CreateLinkData {
  title: string;
  linkType: LinkType;
  tipLink?: TipLink;

  constructor({
    title,
    linkType,
    tipLink,
  }: {
    title: string;
    linkType: LinkType;
    tipLink?: TipLink;
  }) {
    this.title = title;
    this.linkType = linkType;
    this.tipLink = tipLink;
  }

  /**
   *  Convert CreateLinkData to CreateLinkInput for backend consumption
   * @returns Result wrapping CreateLinkInput or Error if validation fails
   */
  toCreateLinkInput(): Result<CreateLinkInput, Error> {
    const link_type = this.linkType.toBackendType();

    const assetInfo: Array<LinkDetailUpdateAssetInfoInput> = [];

    if (this.linkType === LinkType.TIP) {
      if (!this.tipLink) {
        return Err(new Error("Tip link data is missing"));
      }
      assetInfo.push({
        asset: {
          IC: {
            address: Principal.fromText(this.tipLink.asset),
          },
        },
        amount_per_link_use_action: BigInt(this.tipLink.amount),
        label: "SEND_TIP_ASSET",
      });
    }

    const input: CreateLinkInput = {
      title: this.title,
      asset_info: assetInfo,
      link_type: link_type,
      description: [],
      link_image_url: [],
      template: { Central: null },
      link_use_action_max_count: 1n,
      nft_image: [],
    };

    return Ok(input);
  }
}

// Steps in the create link multi-step form
export enum CreateStep {
  ADD_DETAILS = 1,
  ADD_ASSET = 2,
  PREVIEW = 3,
}
