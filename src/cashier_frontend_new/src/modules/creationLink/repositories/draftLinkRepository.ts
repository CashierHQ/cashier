import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import type { GateDraft } from "$modules/gating/types/gate";
import type { LinkStep } from "$modules/links/types/linkStep";
import { DRAFT_LINKS_STORAGE_KEY_PREFIX } from "$modules/shared/constants";
import {
  type AssetInfo as SharedAssetInfo,
  type Link as SharedLink,
  type LinkState as SharedLinkState,
  type LinkType as SharedLinkType,
} from "$shared";
import * as devalue from "devalue";

export type DraftLink = SharedLink & {
  draft_step?: LinkStep;
  draft_gates?: GateDraft[];
};

/**
 * Repository for managing temporary links in localStorage
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
   * Load temporary links from localStorage for the given owner
   * @param owner owner identifier for loading
   * @returns array of SharedLink objects
   */
  private load(owner: string): DraftLink[] {
    const key = this.storeKey(owner);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const list: DraftLink[] = devalue.parse(
        raw,
        SharedLinkMapper.serde.deserialize,
      );
      return list;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse draft links from storage: ${details}`);
    }
  }

  /**
   * Save temporary links to localStorage for the given owner
   * @param links array of SharedLink objects to save
   * @param owner owner identifier for saving
   */
  save(links: DraftLink[], owner: string): void {
    const key = this.storeKey(owner);
    const stringified = devalue.stringify(
      links,
      SharedLinkMapper.serde.serialize,
    );
    localStorage.setItem(key, stringified);
  }

  /**
   * Save a draft link to localStorage
   * @param id local identifier for the draft link
   * @param owner owner identifier for saving
   * @param draftLink SharedLink object to save
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
   * Update an existing temporary link in localStorage
   * @param id local identifier for the temp link
   * @param updateTempLink object containing state and/or createLinkData to update
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
      draftStep?: LinkStep;
      draftGates?: GateDraft[];
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
      draft_step: updateData.draftStep ?? draftLink.draft_step,
      draft_gates: updateData.draftGates ?? draftLink.draft_gates,
    };

    const updatedLinks = links.map((x) => (String(x.id) === id ? updated : x));
    this.save(updatedLinks, owner);
  }

  /**
   * Remove a temporary link by id from localStorage
   * @param id local identifier for the temp link to remove
   * @param owner owner identifier for removing
   */
  delete(id: string, owner: string) {
    const links = this.load(owner);
    if (!links.length) return;

    const filtered = links.filter((x) => String(x.id) !== id);
    this.save(filtered, owner);
  }

  /**
   * Retrieve all temporary links for the given owner from localStorage
   * @param owner owner identifier for retrieving
   * @returns array of SharedLink objects
   */
  get(owner: string): DraftLink[] {
    const list = this.load(owner);

    return list;
  }

  /**
   * Retrieve a single temporary link by id for the given owner from localStorage
   * @param owner owner identifier for retrieving
   * @param tempLinkId local identifier for the temp link to retrieve
   * @returns the SharedLink object or undefined if not found
   */
  getOne(owner: string, tempLinkId: string): DraftLink | undefined {
    const links = this.load(owner);
    if (!links.length) return undefined;
    return links.find((x) => String(x.id) === tempLinkId);
  }
}

export const draftLinkRepository = new DraftLinkRepository();
