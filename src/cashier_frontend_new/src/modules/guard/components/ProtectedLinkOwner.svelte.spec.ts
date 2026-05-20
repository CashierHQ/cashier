// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
import type { GuardContext } from "$modules/guard/context.svelte";
import ProtectedLinkOwnerTestHost from "$modules/guard/components/ProtectedLinkOwnerTestHost.svelte";

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

describe("ProtectedLinkOwner", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("$modules/guard/context.svelte");
    mockContext = new mod.GuardContext() as any;
    mockContext.authState = {
      isReady: true,
      account: { owner: "owner-principal-123" },
    } as any;
  });

  it("renders children when mustBeOwner=true and user is owner", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      link: { creator: "owner-principal-123" },
    } as any;

    render(ProtectedLinkOwnerTestHost, { props: { mustBeOwner: true } });

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("redirects when mustBeOwner=true and user is not owner", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      link: { creator: "different-principal-456" },
    } as any;

    render(ProtectedLinkOwnerTestHost, {
      props: { mustBeOwner: true, redirectTo: "/links" },
    });

    await tick();

    expect(screen.getByText("Redirecting...")).toBeInTheDocument();
    expect(goto).toHaveBeenCalledWith("/links");
  });

  it("redirects when mustBeOwner=false and user is owner", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      link: { creator: "owner-principal-123" },
    } as any;

    render(ProtectedLinkOwnerTestHost, {
      props: { mustBeOwner: false, redirectTo: "/links" },
    });

    await tick();

    expect(screen.getByText("Redirecting...")).toBeInTheDocument();
    expect(goto).toHaveBeenCalledWith("/links");
  });

  it("renders children when mustBeOwner=false and user is not owner", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      link: { creator: "different-principal-456" },
    } as any;

    render(ProtectedLinkOwnerTestHost, { props: { mustBeOwner: false } });

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("renders children for temp links (linkCreationStore)", async () => {
    mockContext.linkCreationStore = {
      state: { step: 0 },
      link: { creator: null },
    } as any;

    render(ProtectedLinkOwnerTestHost);

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("redirects to custom redirectTo when not owner", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      link: { creator: "different-principal-456" },
    } as any;

    render(ProtectedLinkOwnerTestHost, {
      props: { mustBeOwner: true, redirectTo: "/custom-path" },
    });

    await tick();

    expect(goto).toHaveBeenCalledWith("/custom-path");
  });

  it("keeps rendering children during background loading after an allowed state was rendered", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      link: { creator: "owner-principal-123" },
    } as any;

    render(ProtectedLinkOwnerTestHost, { props: { mustBeOwner: true } });

    await tick();
    expect(screen.getByTestId("child")).toBeInTheDocument();

    mockContext.linkDetailStore = {
      query: { isLoading: true },
      link: { creator: "owner-principal-123" },
    } as any;

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });
});
