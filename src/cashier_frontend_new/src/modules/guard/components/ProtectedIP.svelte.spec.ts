// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedIPTestHost from "$modules/guard/components/ProtectedIPTestHost.svelte";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

vi.mock("$modules/guard/state/userIPStore.svelte", () => ({
  userIPStore: {
    countryCode: null,
    isBlacklisted: vi.fn(() => false),
    enabled: true,
    query: {
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    },
  },
}));

describe("ProtectedIP", () => {
  let mockStore: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { userIPStore } =
      await import("$modules/guard/state/userIPStore.svelte");
    mockStore = userIPStore as any;
  });

  it("renders loading when query is loading", () => {
    mockStore.query.isLoading = true;

    render(ProtectedIPTestHost);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("renders children when countryCode is null", async () => {
    mockStore.query.isLoading = false;
    mockStore.countryCode = null;
    mockStore.isBlacklisted = vi.fn(() => false);

    render(ProtectedIPTestHost);

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders children when country is allowed", async () => {
    mockStore.query.isLoading = false;
    mockStore.countryCode = "VN";
    mockStore.isBlacklisted = vi.fn(() => false);

    render(ProtectedIPTestHost);

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders RegionBlocked when country is blacklisted", async () => {
    mockStore.query.isLoading = false;
    mockStore.countryCode = "US";
    mockStore.isBlacklisted = vi.fn(() => true);

    render(ProtectedIPTestHost);

    await tick();

    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(screen.getByText("403")).toBeInTheDocument();
    expect(
      screen.getByText("home.loginModal.regionUnavailable"),
    ).toBeInTheDocument();
  });
});
