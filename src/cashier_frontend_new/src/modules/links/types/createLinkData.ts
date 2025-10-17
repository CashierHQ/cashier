import type {
  AssetInfoDto,
  CreateLinkInput,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { Principal } from "@dfinity/principal";
import { Result, Ok, Err } from "ts-results-es";
import type { LinkType } from "./linkType";

// Tip link details
export type TipLink = {
  // Asset canister ID
  asset: string;
  // Amount to tip per use
  useAmount: number;
};

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

    const assetInfo: Array<AssetInfoDto> = [];

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
        amount_per_link_use_action: BigInt(this.tipLink.useAmount),
        label: "SEND_TIP_ASSET",
      });
    }

    const input: CreateLinkInput = {
      title: this.title,
      asset_info: assetInfo,
      link_type: link_type,
      link_use_action_max_count: 1n,
    };

    return Ok(input);
  }
}
