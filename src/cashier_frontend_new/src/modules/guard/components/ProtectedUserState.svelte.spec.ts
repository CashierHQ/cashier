// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { GuardContext } from "$modules/guard/context.svelte";
import ProtectedUserStateTestHost from "$modules/guard/components/ProtectedUserStateTestHost.svelte";

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

describe("ProtectedUserState", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("$modules/guard/context.svelte");
    mockContext = new mod.GuardContext() as any;
  });

  it("renders loading when isLoading=true and currentStep is null", () => {
    mockContext.userLinkStore = { isLoading: true } as any;

    render(ProtectedUserStateTestHost, {
      props: { allowedStates: [UserLinkStep.LANDING] },
    });

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("redirects to /404 when store exists, not loading, and step is not allowed", async () => {
    mockContext.userLinkStore = {
      step: UserLinkStep.GATE,
      isLoading: false,
    } as any;

    render(ProtectedUserStateTestHost, {
      props: { allowedStates: [UserLinkStep.LANDING] },
    });

    await tick();

    expect(goto).toHaveBeenCalledWith("/404");
  });

  it("renders children when step is valid", async () => {
    mockContext.userLinkStore = {
      step: UserLinkStep.LANDING,
      isLoading: false,
    } as any;

    render(ProtectedUserStateTestHost, {
      props: { allowedStates: [UserLinkStep.LANDING] },
    });

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("keeps rendering children during background loading after a valid state was rendered", async () => {
    mockContext.userLinkStore = {
      step: UserLinkStep.LANDING,
      isLoading: false,
    } as any;

    render(ProtectedUserStateTestHost, {
      props: { allowedStates: [UserLinkStep.LANDING] },
    });

    await tick();
    expect(screen.getByTestId("child")).toBeInTheDocument();

    mockContext.userLinkStore = {
      step: UserLinkStep.LANDING,
      isLoading: true,
    } as any;

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("prefers userLinkStoreV3 over userLinkStore", async () => {
    mockContext.userLinkStore = {
      step: UserLinkStep.GATE,
      isLoading: false,
    } as any;
    mockContext.userLinkStoreV3 = {
      step: UserLinkStep.LANDING,
      isLoading: false,
    } as any;

    render(ProtectedUserStateTestHost, {
      props: { allowedStates: [UserLinkStep.LANDING] },
    });

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });
});
