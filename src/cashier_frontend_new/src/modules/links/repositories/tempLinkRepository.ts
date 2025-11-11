import TempLink, { TempLinkMapper } from "$modules/links/types/tempLink";
import * as devalue from "devalue";
import type { LinkStateValue } from "../types/link/linkState";
import type { CreateLinkData } from "../types/createLinkData";
import { TEMP_LINKS_STORAGE_KEY_PREFIX } from "$modules/shared/constants";

/**
 * Repository for managing temporary links in localStorage
 */
export class TempLinkRepository {
  storeKey(owner: string) {
    return `${TEMP_LINKS_STORAGE_KEY_PREFIX}.${owner}`;
  }

  /**
   * Load temporary links from localStorage for the given owner
   * @param owner owner identifier for loading
   * @returns array of TempLink objects
   */
  private load(owner: string): TempLink[] {
    const key = this.storeKey(owner);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const list: TempLink[] = devalue.parse(
        raw,
        TempLinkMapper.serde.deserialize,
      );
      // Instantiate TempLink objects from parsed data
      return list.map(
        (data) =>
          new TempLink(
            data.id,
            data.create_at,
            data.state,
            data.createLinkData,
          ),
      );
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
  private save(links: TempLink[], owner: string): void {
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
   * @param owner owner identifier for saving
   * @param tempLink TempLink object to save
   */
  create({
    id,
    owner,
    tempLink,
  }: {
    id: string;
    owner: string;
    tempLink: TempLink;
  }) {
    const links = this.load(owner);
    const idx = links.findIndex((x) => String(x.id) === id);
    if (idx >= 0) links[idx] = tempLink;
    else links.push(tempLink);

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
    updateTempLink,
    owner,
  }: {
    id: string;
    updateTempLink: {
      state?: LinkStateValue;
      createLinkData?: CreateLinkData;
    };
    owner: string;
  }) {
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
  delete(id: string, owner: string) {
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
  get(owner: string): TempLink[] {
    const list = this.load(owner);

    return list;
  }

  /**
   * Retrieve a single temporary link by id for the given owner from localStorage
   * @param owner owner identifier for retrieving
   * @param tempLinkId local identifier for the temp link to retrieve
   * @returns the TempLink object or undefined if not found
   */
  getOne(owner: string, tempLinkId: string): TempLink | undefined {
    const links = this.load(owner);
    if (!links.length) return undefined;
    return links.find((x) => String(x.id) === tempLinkId);
  }
}

export const tempLinkRepository = new TempLinkRepository();
