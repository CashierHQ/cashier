// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
import type { GuardContext } from "$modules/guard/context.svelte";
import ProtectedAuthTestHost from "$modules/guard/components/ProtectedAuthTestHost.svelte";

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

vi.mock("$app/paths", () => ({
  resolve: (path: string) => path,
}));

let mockContext: GuardContext;

vi.mock("$modules/guard/context.svelte", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("$modules/guard/context.svelte")>();
  return {
    ...original,
    getGuardContext: () => mockContext,
  };
});

describe("ProtectedAuth", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("$modules/guard/context.svelte");
    mockContext = new mod.GuardContext() as any;
    mockContext.authState = { isReady: false } as any;
    mockContext.userProfile = { isLoggedIn: () => false } as any;
  });

  it("renders loading when auth is not ready", () => {
    mockContext.authState = { isReady: false } as any;

    render(ProtectedAuthTestHost);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("redirects when requireAuth=true and user is not logged in", async () => {
    mockContext.authState = { isReady: true } as any;
    mockContext.userProfile = { isLoggedIn: () => false } as any;

    render(ProtectedAuthTestHost, {
      props: { requireAuth: true, redirectTo: "/" },
    });

    await tick();

    expect(screen.getByText("Redirecting...")).toBeInTheDocument();
    expect(goto).toHaveBeenCalledWith("/");
  });

  it("renders children when requireAuth=true and user is logged in", async () => {
    mockContext.authState = { isReady: true } as any;
    mockContext.userProfile = { isLoggedIn: () => true } as any;

    render(ProtectedAuthTestHost, {
      props: { requireAuth: true },
    });

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(screen.queryByText("Redirecting...")).not.toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("redirects when requireAuth=false and user is logged in", async () => {
    mockContext.authState = { isReady: true } as any;
    mockContext.userProfile = { isLoggedIn: () => true } as any;

    render(ProtectedAuthTestHost, {
      props: { requireAuth: false, redirectTo: "/" },
    });

    await tick();

    // shouldShow is true when requireAuth=false and auth is ready
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(goto).toHaveBeenCalledWith("/");
  });

  it("renders children when requireAuth=false and user is not logged in", async () => {
    mockContext.authState = { isReady: true } as any;
    mockContext.userProfile = { isLoggedIn: () => false } as any;

    render(ProtectedAuthTestHost, {
      props: { requireAuth: false },
    });

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("redirects to custom redirectTo", async () => {
    mockContext.authState = { isReady: true } as any;
    mockContext.userProfile = { isLoggedIn: () => false } as any;

    render(ProtectedAuthTestHost, {
      props: { requireAuth: true, redirectTo: "/custom-path" },
    });

    await tick();

    expect(goto).toHaveBeenCalledWith("/custom-path");
  });
});
