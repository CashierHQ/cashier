// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
import { LinkStep } from "$modules/links/types/linkStep";
import type { GuardContext } from "$modules/guard/context.svelte";
import ProtectedLinkStateTestHost from "./ProtectedLinkStateTestHost.svelte";

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

describe("ProtectedLinkState", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("$modules/guard/context.svelte");
    mockContext = new mod.GuardContext() as any;
  });

  it("renders loading when link store query is loading", () => {
    mockContext.linkDetailStore = {
      query: { isLoading: true },
      state: { step: LinkStep.CREATED },
    } as any;

    render(ProtectedLinkStateTestHost, {
      props: { allowedStates: [LinkStep.CREATED, LinkStep.ACTIVE] },
    });

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("redirects to /404 when state is not allowed", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      state: { step: LinkStep.ENDED },
    } as any;

    render(ProtectedLinkStateTestHost, {
      props: { allowedStates: [LinkStep.CREATED, LinkStep.ACTIVE] },
    });

    await tick();

    expect(goto).toHaveBeenCalledWith("/404");
  });

  it("renders children when state is allowed", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      state: { step: LinkStep.ACTIVE },
    } as any;

    render(ProtectedLinkStateTestHost, {
      props: { allowedStates: [LinkStep.CREATED, LinkStep.ACTIVE] },
    });

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("redirects for temp link (linkCreationStore) when step is invalid", async () => {
    mockContext.linkCreationStore = {
      state: { step: LinkStep.ENDED },
    } as any;

    render(ProtectedLinkStateTestHost, {
      props: { allowedStates: [LinkStep.CHOOSE_TYPE, LinkStep.ADD_ASSET] },
    });

    await tick();

    expect(goto).toHaveBeenCalledWith("/404");
  });
});
