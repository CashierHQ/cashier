import type { LinkStep } from "$modules/links/types/linkStep";
import type {
  AssetInfo as SharedAssetInfo,
  Link as SharedLink,
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
} from "$shared";

/**
 * Draft-only link model used by the create-link flow.
 *
 * `SharedLink.link_state` is the backend-compatible lifecycle state. It does
 * not represent every frontend wizard step, so draft restoration keeps the
 * exact UI step separately.
 */
export type DraftLink = SharedLink & {
  creationStep?: LinkStep;
};

/**
 * LocalStorage envelope for draft links.
 *
 * `link` stays compatible with shared/backend link serialization, while
 * `creationStep` keeps frontend-only wizard progress.
 */
export type DraftLinkStorageRecord = {
  link: SharedLink;
  creationStep?: LinkStep;
};

/**
 * Draft link fields that can be changed while editing a local draft.
 */
export type DraftLinkUpdateData = {
  title?: string;
  linkType?: SharedLinkType;
  maxUse?: bigint;
  assetInfo?: SharedAssetInfo[];
  state?: SharedLinkState;
  creationStep?: LinkStep;
};

/**
 * Parameters used when creating or replacing a draft link in local storage.
 */
export type DraftLinkCreateParams = {
  id: string;
  owner: string;
  draftLink: DraftLink;
};

/**
 * Parameters used when updating a draft link in local storage.
 */
export type DraftLinkUpdateParams = {
  id: string;
  updateData: DraftLinkUpdateData;
  owner: string;
};
