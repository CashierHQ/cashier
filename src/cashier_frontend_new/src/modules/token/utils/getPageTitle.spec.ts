import { describe, expect, it } from "vitest";
import { getPageTitle } from "./getPageTitle";

describe("getPageTitle", () => {
  it("should return custom header when provided", () => {
    expect(getPageTitle("/wallet/send", "Custom Header")).toBe("Custom Header");
    expect(getPageTitle("/wallet/receive", "My Custom Title")).toBe(
      "My Custom Title",
    );
    expect(getPageTitle("/wallet/swap", "Swap Tokens")).toBe("Swap Tokens");
  });

  it("should return 'Send' for /wallet/send path", () => {
    expect(getPageTitle("/wallet/send")).toBe("Send");
  });

  it("should return 'Receive' for /wallet/receive path", () => {
    expect(getPageTitle("/wallet/receive")).toBe("Receive");
  });

  it("should return 'Swap' for /wallet/swap path", () => {
    expect(getPageTitle("/wallet/swap")).toBe("Swap");
  });

  it("should return 'Manage tokens' for /wallet/manage path", () => {
    expect(getPageTitle("/wallet/manage")).toBe("Manage tokens");
  });

  it("should return 'Import manually' for /wallet/import path", () => {
    expect(getPageTitle("/wallet/import")).toBe("Import manually");
  });

  it("should return empty string for unknown paths", () => {
    expect(getPageTitle("/wallet")).toBe("");
    expect(getPageTitle("/wallet/unknown")).toBe("");
    expect(getPageTitle("/other/path")).toBe("");
  });

  it("should prioritize custom header over path-based title", () => {
    expect(getPageTitle("/wallet/send", "Custom Send")).toBe("Custom Send");
    expect(getPageTitle("/wallet/receive", "Custom Receive")).toBe(
      "Custom Receive",
    );
  });
});
