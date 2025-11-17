import * as devalue from "devalue";

const USER_LINKS_STORAGE_KEY_PREFIX = "user_link";

export type PersistedUserLink = {
  linkId: string;
  step?: number;
  updatedAt: number;
};

export class UserLinkRepository {
  // Storage key for a specific owner+linkId
  storeKey(owner: string, linkId: string) {
    return `${USER_LINKS_STORAGE_KEY_PREFIX}.${owner}.${linkId}`;
  }

  // Read a single persisted entry for owner+linkId
  private readItem(owner: string, linkId: string): PersistedUserLink | null {
    const key = this.storeKey(owner, linkId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const entry: PersistedUserLink = devalue.parse(raw);
      return entry;
    } catch (e) {
      console.warn("Failed to parse persisted user link from localStorage", e);
      return null;
    }
  }

  // Write a single persisted entry for owner+linkId
  private writeItem(
    owner: string,
    linkId: string,
    entry: PersistedUserLink,
  ): void {
    try {
      const key = this.storeKey(owner, linkId);
      const stringified = devalue.stringify(entry);
      localStorage.setItem(key, stringified);
    } catch (e) {
      console.error("Error saving user link to localStorage", e);
    }
  }

  /**
   * Upsert an entry for the given owner/linkId. If an entry exists it is
   * merged with the provided `data`, otherwise a new entry is appended.
   */
  upsert({
    owner,
    linkId,
    data,
  }: {
    owner: string;
    linkId: string;
    data: Partial<PersistedUserLink>;
  }) {
    const now = Date.now();
    const existing = this.readItem(owner, linkId);
    const entry: PersistedUserLink = {
      linkId,
      step: data.step ?? existing?.step,
      updatedAt: now,
    };
    this.writeItem(owner, linkId, entry);
  }

  delete(owner: string, linkId: string) {
    const key = this.storeKey(owner, linkId);
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("Error removing user link from localStorage", e);
    }
  }

  getOne(owner: string, linkId: string): PersistedUserLink | undefined {
    const entry = this.readItem(owner, linkId);
    return entry ?? undefined;
  }
}

export const userLinkRepository = new UserLinkRepository();
