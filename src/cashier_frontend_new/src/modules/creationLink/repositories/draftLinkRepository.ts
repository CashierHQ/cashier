import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import { DRAFT_LINKS_STORAGE_KEY_PREFIX } from "$modules/shared/constants";
import {
  type AssetInfo as SharedAssetInfo,
  type Link as SharedLink,
  type LinkState as SharedLinkState,
  type LinkType as SharedLinkType,
} from "$shared";
import * as devalue from "devalue";

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
   * @returns array of SharedLink objects
   */
  private load(owner: string): SharedLink[] {
    const key = this.storeKey(owner);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const list: SharedLink[] = devalue.parse(
        raw,
        SharedLinkMapper.serde.deserialize,
      );
      return list;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse draft links from storage: ${details}`, {
        cause: error,
      });
    }
  }

  /**
   * Save draft links to localStorage for the given owner.
   * @param links array of SharedLink objects to save
   * @param owner owner identifier for saving
   */
  save(links: SharedLink[], owner: string): void {
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
    draftLink: SharedLink;
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
    };
    owner: string;
  }) {
    const links = this.load(owner);
    if (!links.length) return;

    const draftLink = links.find((x) => String(x.id) === id);
    if (!draftLink) return;

    const updated: SharedLink = {
      ...draftLink,
      title: updateData.title ?? draftLink.title,
      link_type: updateData.linkType ?? draftLink.link_type,
      max_use:
        updateData.maxUse !== undefined
          ? BigInt(updateData.maxUse)
          : draftLink.max_use,
      asset_info: updateData.assetInfo ?? draftLink.asset_info,
      link_state: updateData.state ?? draftLink.link_state,
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
   * @returns array of SharedLink objects
   */
  get(owner: string): SharedLink[] {
    const list = this.load(owner);

    return list;
  }

  /**
   * Retrieve a single draft link by id for the given owner from localStorage.
   * @param owner owner identifier for retrieving
   * @param draftLinkId local identifier for the draft link to retrieve
   * @returns the SharedLink object or undefined if not found
   */
  getOne(owner: string, draftLinkId: string): SharedLink | undefined {
    const links = this.load(owner);
    if (!links.length) return undefined;
    return links.find((x) => String(x.id) === draftLinkId);
  }
}

export const draftLinkRepository = new DraftLinkRepository();
