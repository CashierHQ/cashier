import { describe, expect, it } from "vitest";
import {
  BUILD_APP_VERSION,
  BUILD_COMMIT_HASH,
  BUILD_TIMESTAMP,
} from "./constants";

describe("Build data should be injected by vite at build time", () => {
  it("should get a TokenId from a string", () => {
    expect(BUILD_APP_VERSION.length).toBeGreaterThan(0);
    expect(BUILD_COMMIT_HASH.length).toBeGreaterThan(0);
    expect(BUILD_TIMESTAMP.length).toBeGreaterThan(0);
  });
});
