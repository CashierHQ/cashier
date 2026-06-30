import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import {
  toDraftLink,
  toDraftLinkStorageRecord,
} from "$modules/creationLink/services/draftLinkStorage";
import type {
  DraftLink,
  DraftLinkCreateParams,
  DraftLinkStorageRecord,
  DraftLinkUpdateParams,
} from "$modules/creationLink/types";
import { DRAFT_LINKS_STORAGE_KEY_PREFIX } from "$modules/shared/constants";
import { type Link as SharedLink } from "$shared";
import * as devalue from "devalue";

/**
 * Repository for managing draft links in localStorage.
 */
export class DraftLinkRepository {
  /**
   * Builds the localStorage key for a draft-link owner.
   *
   * @param owner - Owner identifier for the key.
   * @returns LocalStorage key string.
   */
  storeKey(owner: string) {
    return `${DRAFT_LINKS_STORAGE_KEY_PREFIX}.${owner}`;
  }

  /**
   * Load draft links from localStorage for the given owner.
   *
   * @param owner - Owner identifier for loading.
   * @returns Draft links restored from localStorage.
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
   *
   * @param links - Draft links to save.
   * @param owner - Owner identifier for saving.
   * @returns Nothing.
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
   * Creates or replaces a draft link in localStorage.
   *
   * @param params - Draft link create parameters.
   * @param params.id - Local identifier for the draft link.
   * @param params.owner - Owner identifier for saving.
   * @param params.draftLink - Draft link to save.
   * @returns Nothing.
   */
  create({ id, owner, draftLink }: DraftLinkCreateParams): void {
    const links = this.load(owner);
    const idx = links.findIndex((x) => String(x.id) === id);
    if (idx >= 0) links[idx] = draftLink;
    else links.push(draftLink);

    this.save(links, owner);
  }

  /**
   * Update an existing draft link in localStorage.
   *
   * @param params - Draft link update parameters.
   * @param params.id - Local identifier for the draft link.
   * @param params.updateData - Draft fields to update.
   * @param params.owner - Owner identifier for updating.
   * @returns Nothing.
   */
  update({ id, updateData, owner }: DraftLinkUpdateParams): void {
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
   *
   * @param id - Local identifier for the draft link to remove.
   * @param owner - Owner identifier for removing.
   * @returns Nothing.
   */
  delete(id: string, owner: string): void {
    const links = this.load(owner);
    if (!links.length) return;

    const filtered = links.filter((x) => String(x.id) !== id);
    this.save(filtered, owner);
  }

  /**
   * Retrieve all draft links for the given owner from localStorage.
   *
   * @param owner - Owner identifier for retrieving.
   * @returns Draft links for the owner.
   */
  get(owner: string): DraftLink[] {
    const list = this.load(owner);

    return list;
  }

  /**
   * Retrieve a single draft link by id for the given owner from localStorage.
   *
   * @param owner - Owner identifier for retrieving.
   * @param draftLinkId - Local identifier for the draft link to retrieve.
   * @returns Draft link when found; otherwise `undefined`.
   */
  getOne(owner: string, draftLinkId: string): DraftLink | undefined {
    const links = this.load(owner);
    if (!links.length) return undefined;
    return links.find((x) => String(x.id) === draftLinkId);
  }
}

export const draftLinkRepository = new DraftLinkRepository();
