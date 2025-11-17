import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { userLinkRepository } from "./userLinkRepository";

// Simple localStorage mock used across tests
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    // helper to inspect stored values in tests
    __store: () => ({ ...store }),
  };
};

describe("userLinkRepository", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;
  const owner = "owner-1";
  const linkId = "link-123";

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("upsert should write a persisted entry and getOne should read it back", () => {
    userLinkRepository.upsert({
      owner,
      linkId,
      data: { step: 2 },
    });

    // ensure localStorage.setItem was called with the expected key
    const expectedKey = `user_link.${owner}.${linkId}`;
    expect(localStorageMock.setItem).toHaveBeenCalled();
    expect(Object.keys(localStorageMock.__store())).toContain(expectedKey);

    const persisted = userLinkRepository.getOne(owner, linkId);
    expect(persisted).toBeDefined();
    expect(persisted?.linkId).toBe(linkId);
    expect(persisted?.step).toBe(2);
    expect(typeof persisted?.updatedAt).toBe("number");
  });

  it("upsert should merge and update existing entry's step when provided", () => {
    // initial write
    userLinkRepository.upsert({ owner, linkId, data: { step: 1 } });
    const first = userLinkRepository.getOne(owner, linkId)!;

    // update with new step
    userLinkRepository.upsert({ owner, linkId, data: { step: 3 } });
    const second = userLinkRepository.getOne(owner, linkId)!;

    expect(second.step).toBe(3);
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt);
  });

  it("upsert should preserve existing step when data.step is undefined", () => {
    userLinkRepository.upsert({ owner, linkId, data: { step: 5 } });
    const before = userLinkRepository.getOne(owner, linkId)!;

    // call upsert without step
    userLinkRepository.upsert({ owner, linkId, data: {} });
    const after = userLinkRepository.getOne(owner, linkId)!;

    expect(after.step).toBe(before.step);
  });

  it("delete should remove the persisted entry", () => {
    userLinkRepository.upsert({ owner, linkId, data: { step: 7 } });
    expect(userLinkRepository.getOne(owner, linkId)).toBeDefined();

    userLinkRepository.delete(owner, linkId);

    expect(localStorageMock.removeItem).toHaveBeenCalled();
    expect(userLinkRepository.getOne(owner, linkId)).toBeUndefined();
  });

  it("getOne should return undefined for missing entries", () => {
    const result = userLinkRepository.getOne("no-owner", "no-link");
    expect(result).toBeUndefined();
  });
});
