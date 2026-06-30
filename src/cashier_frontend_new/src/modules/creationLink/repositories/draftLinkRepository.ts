import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import type { DraftLink } from "$modules/creationLink/types/draftLink";
import { LinkStep } from "$modules/links/types/linkStep";
import { DRAFT_LINKS_STORAGE_KEY_PREFIX } from "$modules/shared/constants";
import {
  type AssetInfo as SharedAssetInfo,
  type Link as SharedLink,
  type LinkState as SharedLinkState,
  type LinkType as SharedLinkType,
  LinkState as SharedLinkStateValue,
} from "$shared";
import * as devalue from "devalue";

type DraftLinkStorageRecord = {
  link: SharedLink;
  creationStep?: LinkStep;
};

/**
 * Checks whether a parsed localStorage value uses the draft-link envelope.
 *
 * @param value Parsed localStorage value to inspect.
 * @returns `true` when the value contains a stored shared link.
 */
function isDraftLinkStorageRecord(
  value: unknown,
): value is DraftLinkStorageRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "link" in value &&
    typeof value.link === "object" &&
    value.link !== null
  );
}

/**
 * Maps backend-compatible link lifecycle state to the closest create-flow step.
 *
 * @param linkState Persisted shared link lifecycle state.
 * @returns Matching create-flow step when one exists.
 */
function deriveCreationStepFromLinkState(
  linkState: SharedLinkState,
): LinkStep | undefined {
  switch (linkState) {
    case SharedLinkStateValue.ChooseType:
      return LinkStep.CHOOSE_TYPE;
    case SharedLinkStateValue.AddAsset:
      return LinkStep.ADD_ASSET;
    case SharedLinkStateValue.Preview:
      return LinkStep.PREVIEW;
    case SharedLinkStateValue.Created:
      return LinkStep.CREATED;
    default:
      return undefined;
  }
}

/**
 * Converts either current or legacy localStorage records into draft links.
 *
 * @param record Current draft-link envelope or legacy shared link.
 * @returns Draft link with create-flow metadata restored.
 */
function toDraftLink(record: DraftLinkStorageRecord | SharedLink): DraftLink {
  if (isDraftLinkStorageRecord(record)) {
    return {
      ...record.link,
      creationStep:
        record.creationStep ??
        deriveCreationStepFromLinkState(record.link.link_state),
    };
  }

  return {
    ...record,
    creationStep: deriveCreationStepFromLinkState(record.link_state),
  };
}

/**
 * Converts a draft link into the localStorage envelope shape.
 *
 * @param draftLink Draft link to persist.
 * @returns Storage record containing backend-compatible link data and UI step.
 */
function toDraftLinkStorageRecord(
  draftLink: DraftLink,
): DraftLinkStorageRecord {
  const { creationStep, ...link } = draftLink;

  return {
    link,
    creationStep,
  };
}

/**
 * Repository for managing draft links in localStorage.
 */
export class DraftLinkRepository {
  /**
   * LocalStorage key generator
   * @param owner owner identifier for the key
   * @returns localStorage key string
   */
  storeKey(owner: string) {
    return `${DRAFT_LINKS_STORAGE_KEY_PREFIX}.${owner}`;
  }

  /**
   * Load draft links from localStorage for the given owner.
   * @param owner owner identifier for loading
   * @returns array of draft links
   */
  private load(owner: string): DraftLink[] {
    const key = this.storeKey(owner);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const list = devalue.parse(
        raw,
        SharedLinkMapper.serde.deserialize,
      ) as Array<DraftLinkStorageRecord | SharedLink>;

      return list.map(toDraftLink);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse draft links from storage: ${details}`, {
        cause: error,
      });
    }
  }

  /**
   * Save draft links to localStorage for the given owner.
   * @param links array of draft links to save
   * @param owner owner identifier for saving
   */
  save(links: DraftLink[], owner: string): void {
    const key = this.storeKey(owner);
    const stringified = devalue.stringify(
      links.map(toDraftLinkStorageRecord),
      SharedLinkMapper.serde.serialize,
    );
    localStorage.setItem(key, stringified);
  }

  /**
   * Save a draft link to localStorage
   * @param id local identifier for the draft link
   * @param owner owner identifier for saving
   * @param draftLink draft link to save
   */
  create({
    id,
    owner,
    draftLink,
  }: {
    id: string;
    owner: string;
    draftLink: DraftLink;
  }) {
    const links = this.load(owner);
    const idx = links.findIndex((x) => String(x.id) === id);
    if (idx >= 0) links[idx] = draftLink;
    else links.push(draftLink);

    this.save(links, owner);
  }

  /**
   * Update an existing draft link in localStorage.
   * @param id local identifier for the draft link
   * @param updateDraftLink object containing state and/or link data to update
   * @param owner owner identifier for updating
   */
  update({
    id,
    updateData,
    owner,
  }: {
    id: string;
    updateData: {
      title?: string;
      linkType?: SharedLinkType;
      maxUse?: bigint;
      assetInfo?: SharedAssetInfo[];
      state?: SharedLinkState;
      creationStep?: LinkStep;
    };
    owner: string;
  }) {
    const links = this.load(owner);
    if (!links.length) return;

    const draftLink = links.find((x) => String(x.id) === id);
    if (!draftLink) return;

    const updated: DraftLink = {
      ...draftLink,
      title: updateData.title ?? draftLink.title,
      link_type: updateData.linkType ?? draftLink.link_type,
      max_use:
        updateData.maxUse !== undefined
          ? BigInt(updateData.maxUse)
          : draftLink.max_use,
      asset_info: updateData.assetInfo ?? draftLink.asset_info,
      link_state: updateData.state ?? draftLink.link_state,
      creationStep: updateData.creationStep ?? draftLink.creationStep,
    };

    const updatedLinks = links.map((x) => (String(x.id) === id ? updated : x));
    this.save(updatedLinks, owner);
  }

  /**
   * Remove a draft link by id from localStorage.
   * @param id local identifier for the draft link to remove
   * @param owner owner identifier for removing
   */
  delete(id: string, owner: string) {
    const links = this.load(owner);
    if (!links.length) return;

    const filtered = links.filter((x) => String(x.id) !== id);
    this.save(filtered, owner);
  }

  /**
   * Retrieve all draft links for the given owner from localStorage.
   * @param owner owner identifier for retrieving
   * @returns array of draft links
   */
  get(owner: string): DraftLink[] {
    const list = this.load(owner);

    return list;
  }

  /**
   * Retrieve a single draft link by id for the given owner from localStorage.
   * @param owner owner identifier for retrieving
   * @param draftLinkId local identifier for the draft link to retrieve
   * @returns the draft link or undefined if not found
   */
  getOne(owner: string, draftLinkId: string): DraftLink | undefined {
    const links = this.load(owner);
    if (!links.length) return undefined;
    return links.find((x) => String(x.id) === draftLinkId);
  }
}

export const draftLinkRepository = new DraftLinkRepository();
