import type {
  CreateLinkInput,
  LinkDetailUpdateAssetInfoInput,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { Principal } from "@dfinity/principal";
import { Result, Ok, Err } from "ts-results-es";
import type { LinkType } from "./linkType";

// Tip link details
export type TipLink = {
  asset: string;
  amount: number;
};

/** Data required to create a new link */
export class CreateLinkData {
  title: string;
  linkType: LinkType; // kept generic here; the concrete LinkType lives in ../types.ts
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

    // We can't directly compare LinkType here because it's imported elsewhere;
    // consumers should pass the frontend LinkType instance. We check using id.
    if (this.linkType?.id === "TIP") {
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
