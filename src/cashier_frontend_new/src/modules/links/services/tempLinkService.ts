import TempLink, { TempLinkMapper } from "$modules/links/types/tempLink";
import * as devalue from "devalue";
import type { LinkStateValue } from "../types/link/linkState";
import type { CreateLinkData } from "../types/createLinkData";
import { CURRENT_CREATING_LINK_ID_KEY } from "$modules/shared/constants";

const PREFIX = "tempLinks";

function storageKey(owner?: string) {
  return owner ? `${PREFIX}.${owner}` : `${PREFIX}.anon`;
}

/**
 * Service for managing temporary links in localStorage
 */
export class TempLinkService {
  /**
   * Save a temporary link to localStorage
   * @param id local identifier for the temp link
   * @param tempLink the TempLink object to save
   * @param owner owner identifier for storing
   */
  create(id: string, tempLink: TempLink, owner: string) {
    const key = storageKey(owner);
    const raw = localStorage.getItem(key);
    let arr: TempLink[] = [];
    if (raw) {
      try {
        arr = devalue.parse(raw, TempLinkMapper.serde.deserialize);
      } catch {
        console.warn("Failed to parse existing temp links, overwriting.");
        arr = [];
      }
    }

    console.log(`Storing temp link ${id} for owner ${owner}`);

    // replace if exists
    const idx = arr.findIndex((x) => String(x.id) === id);
    if (idx >= 0) arr[idx] = tempLink;
    else arr.push(tempLink);

    console.log(`Total temp links for owner ${owner}: ${tempLink}`);

    const stringified = devalue.stringify(arr, TempLinkMapper.serde.serialize);
    localStorage.setItem(key, stringified);
    localStorage.setItem(CURRENT_CREATING_LINK_ID_KEY, id);
  }

  /**
   * Update an existing temporary link in localStorage
   * @param id local identifier for the temp link
   * @param updateFn function that takes the existing TempLink and returns an updated TempLink
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
    const list = this.get(owner);
    console.log("get list ", list);
    if (!list) return;
    console.log(`Updating temp link ${id} for owner ${owner}`);
    try {
      const tempLink = list.find((x) => String(x.id) === id);
      if (!tempLink) return;
      const existing = tempLink;
      const updated: TempLink = {
        ...existing,
        state: updateTempLink.state ?? existing.state,
        createLinkData:
          updateTempLink.createLinkData ?? existing.createLinkData,
      };
      const updatedList = list.map((x) => (String(x.id) === id ? updated : x));
      const key = storageKey(owner);
      localStorage.setItem(
        key,
        devalue.stringify(updatedList, TempLinkMapper.serde.serialize),
      );
    } catch {
      // ignore
    }
  }

  /**
   * Retrieve all temporary links for the given owner from localStorage
   * @param owner owner identifier for retrieving
   * @returns array of TempLink objects
   */
  get(owner?: string): TempLink[] {
    const key = storageKey(owner);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return devalue.parse(raw, TempLinkMapper.serde.deserialize);
    } catch {
      return [];
    }
  }

  /**
   * Get the current creating temporary link for the given owner
   * @param owner owner identifier for retrieving
   * @returns the current TempLink or undefined if not found
   */
  getCurrentCreateLink(owner: string): TempLink | undefined {
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

  /**
   * Remove a temporary link by id from localStorage
   * @param id local identifier for the temp link to remove
   * @param owner owner identifier for removing
   */
  delete(id: string, owner?: string) {
    const key = storageKey(owner);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const arr: TempLink[] = devalue.parse(
        raw,
        TempLinkMapper.serde.deserialize,
      );
      const filtered = arr.filter((x) => String(x.id) !== id);
      localStorage.setItem(key, devalue.stringify(filtered));
    } catch {
      // ignore
    }
  }
}

const tempLinkService = new TempLinkService();
export default tempLinkService;
