import * as devalue from "devalue";

const USER_LINKS_STORAGE_KEY_PREFIX = "user_link";

export type PersistedUserLink = {
  linkId: string;
  step?: number;
  updatedAt: number;
};

export class UserLinkRepository {
  storeKey(owner: string) {
    return `${USER_LINKS_STORAGE_KEY_PREFIX}.${owner}`;
  }

  private load(owner: string): PersistedUserLink[] {
    const key = this.storeKey(owner);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const list: PersistedUserLink[] = devalue.parse(raw);
      return list;
    } catch (e) {
      console.warn("Failed to parse user links from localStorage", e);
      return [];
    }
  }

  private save(links: PersistedUserLink[], owner: string): void {
    const key = this.storeKey(owner);
    try {
      const stringified = devalue.stringify(links);
      localStorage.setItem(key, stringified);
    } catch (e) {
      console.error("Error saving user links to localStorage", e);
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
    const links = this.load(owner);
    const existing = links.find((x) => String(x.linkId) === linkId);

    const entry: PersistedUserLink = {
      linkId,
      step: data.step ?? existing?.step,
      updatedAt: now,
    };

    if (existing) {
      const updatedLinks = links.map((x) =>
        String(x.linkId) === linkId ? entry : x,
      );
      this.save(updatedLinks, owner);
    } else {
      links.push(entry);
      this.save(links, owner);
    }
  }

  delete(owner: string, linkId: string) {
    const links = this.load(owner);
    if (!links.length) return;

    const filtered = links.filter((x) => String(x.linkId) !== linkId);
    this.save(filtered, owner);
  }

  get(owner: string): PersistedUserLink[] {
    return this.load(owner);
  }

  getOne(owner: string, linkId: string): PersistedUserLink | undefined {
    const links = this.load(owner);
    if (!links.length) return undefined;
    return links.find((x) => String(x.linkId) === linkId);
  }
}

export const userLinkRepository = new UserLinkRepository();
