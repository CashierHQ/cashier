import TempLink, { TempLinkMapper } from "$modules/links/types/tempLink";
import * as devalue from "devalue";
import type { LinkStateValue } from "../types/link/linkState";
import type { CreateLinkData } from "../types/createLinkData";
import {
  CURRENT_CREATING_LINK_ID_KEY,
  TEMP_LINKS_STORAGE_KEY_PREFIX,
} from "$modules/shared/constants";

/**
 * Service for managing temporary links in localStorage
 */
export class TempLinkService {
  storeKey(owner?: string) {
    return owner
      ? `${TEMP_LINKS_STORAGE_KEY_PREFIX}.${owner}`
      : `${TEMP_LINKS_STORAGE_KEY_PREFIX}.anon`;
  }

  /**
   * Load temporary links from localStorage for the given owner
   * @param owner owner identifier for loading
   * @returns array of TempLink objects
   */
  private load(owner?: string): TempLink[] {
    const key = this.storeKey(owner);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return devalue.parse(raw, TempLinkMapper.serde.deserialize);
    } catch {
      console.warn("Failed to parse temp links from localStorage");
      return [];
    }
  }

  /**
   * Save temporary links to localStorage for the given owner
   * @param links array of TempLink objects to save
   * @param owner owner identifier for saving
   */
  private save(links: TempLink[], owner?: string): void {
    const key = this.storeKey(owner);
    const stringified = devalue.stringify(
      links,
      TempLinkMapper.serde.serialize,
    );
    localStorage.setItem(key, stringified);
  }

  /**
   * Save a temporary link to localStorage
   * @param id local identifier for the temp link
   * @param tempLink the TempLink object to save
   * @param owner owner identifier for storing
   */
  create(id: string, tempLink: TempLink, owner: string) {
    const links = this.load(owner);

    // replace if exists
    const idx = links.findIndex((x) => String(x.id) === id);
    if (idx >= 0) links[idx] = tempLink;
    else links.push(tempLink);

    this.save(links, owner);
    localStorage.setItem(CURRENT_CREATING_LINK_ID_KEY, id);
  }

  /**
   * Update an existing temporary link in localStorage
   * @param id local identifier for the temp link
   * @param updateTempLink object containing state and/or createLinkData to update
   * @param owner owner identifier for updating
   */
  update(
    id: string,
    updateTempLink: {
      state?: LinkStateValue;
      createLinkData?: CreateLinkData;
    },
    owner: string,
  ) {
    const links = this.load(owner);
    if (!links.length) return;

    const tempLink = links.find((x) => String(x.id) === id);
    if (!tempLink) return;

    const updated: TempLink = {
      ...tempLink,
      state: updateTempLink.state ?? tempLink.state,
      createLinkData: updateTempLink.createLinkData ?? tempLink.createLinkData,
    };

    const updatedLinks = links.map((x) => (String(x.id) === id ? updated : x));
    this.save(updatedLinks, owner);
  }

  /**
   * Remove a temporary link by id from localStorage
   * @param id local identifier for the temp link to remove
   * @param owner owner identifier for removing
   */
  delete(id: string, owner?: string) {
    const links = this.load(owner);
    if (!links.length) return;

    const filtered = links.filter((x) => String(x.id) !== id);
    this.save(filtered, owner);
  }

  /**
   * Retrieve all temporary links for the given owner from localStorage
   * @param owner owner identifier for retrieving
   * @returns array of TempLink objects
   */
  get(owner?: string): TempLink[] {
    return this.load(owner);
  }

  /**
   * Get the current creating temporary link for the given owner
   * @param owner owner identifier for retrieving
   * @returns the current TempLink or undefined if not found
   */
  getCurrentCreateLink(owner?: string): TempLink | undefined {
    const id = localStorage.getItem(CURRENT_CREATING_LINK_ID_KEY);
    return this.get(owner).find((link) => String(link.id) === id);
  }

  /**
   * Set the current creating temporary link ID in localStorage
   * @param id local identifier for the temp link
   */
  setCurrentCreateLink(id: string) {
    localStorage.setItem(CURRENT_CREATING_LINK_ID_KEY, id);
  }
}

export const tempLinkService = new TempLinkService();
