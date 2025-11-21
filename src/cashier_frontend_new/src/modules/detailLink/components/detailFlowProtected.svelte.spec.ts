// @vitest-environment jsdom
import { expect, vi, beforeEach, describe, it } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";

// Mock SvelteKit navigation + paths before importing the component
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/paths", () => ({ resolve: (p: string) => p }));

// Mock auth state with a writable structure using vi.hoisted
const mockAuthState = vi.hoisted(() => {
  return {
    account: {
      owner: "test-owner-principal",
    } as { owner: string } | null,
    isReady: true,
  };
});

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: mockAuthState,
}));

import DetailFlowProtected from "./detailFlowProtected.svelte";
import type { LinkDetailStore } from "../state/linkDetailStore.svelte";
import { goto } from "$app/navigation";
import { LinkStep } from "$modules/links/types/linkStep";

// Helper to create a mocked linkStore (mirrors the shape used by the component)
function createMockLinkDetailStore(
  step: number,
  creatorPrincipal: string | null = "test-owner-principal",
  hasLink: boolean = true,
  isLoading: boolean = false,
) {
  return {
    state: { step },
    link: hasLink
      ? {
          creator: {
            toString: () => creatorPrincipal,
          },
        }
      : null,
    query: {
      isLoading,
    },
  } as unknown as LinkDetailStore;
}

describe("DetailFlowProtected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth state to default by mutating the hoisted mock object
    mockAuthState.account = { owner: "test-owner-principal" };
  });

  it("renders children when step is allowed and user is creator", async () => {
    const linkStore = createMockLinkDetailStore(LinkStep.ACTIVE);

    const snip = createRawSnippet(() => {
      return {
        render: () => `<div data-testid="slot">child</div>`,
      };
    });

    render(DetailFlowProtected, {
      props: { linkStore, children: snip },
    });

    // Ensure Svelte effects have run
    flushSync();

    expect(screen.getByTestId("slot")).toBeInTheDocument();
    expect(
      (goto as unknown as { mock: { calls: unknown[] } }).mock.calls.length,
    ).toBe(0);
  });

  it("redirects when step is not allowed", async () => {
    const linkStore = createMockLinkDetailStore(LinkStep.CHOOSE_TYPE);

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`,
    }));

    render(DetailFlowProtected, {
      props: { linkStore, children: snip },
    });

    flushSync();

    const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
    expect(gotoMock.calls.length).toBeGreaterThanOrEqual(1);
    expect(gotoMock.calls[0][0] as string).toBe("/links");
  });

  it("redirects when user is not the creator", async () => {
    const linkStore = createMockLinkDetailStore(
      LinkStep.ACTIVE,
      "different-owner-principal",
    );

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`,
    }));

    render(DetailFlowProtected, {
      props: { linkStore, children: snip },
    });

    flushSync();

    const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
    expect(gotoMock.calls.length).toBeGreaterThanOrEqual(1);
    expect(gotoMock.calls[0][0] as string).toBe("/links");
  });

  it("redirects when link is null", async () => {
    const linkStore = createMockLinkDetailStore(LinkStep.ACTIVE, null, false);

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`,
    }));

    render(DetailFlowProtected, {
      props: { linkStore, children: snip },
    });

    flushSync();

    const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
    expect(gotoMock.calls.length).toBeGreaterThanOrEqual(1);
    expect(gotoMock.calls[0][0] as string).toBe("/links");
  });

  it("shows loading state when link is null", async () => {
    const linkStore = createMockLinkDetailStore(LinkStep.ACTIVE, null, false);

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`,
    }));

    render(DetailFlowProtected, {
      props: { linkStore, children: snip },
    });

    flushSync();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders children for all allowed steps", async () => {
    const allowedSteps = [
      LinkStep.CREATED,
      LinkStep.ACTIVE,
      LinkStep.INACTIVE,
      LinkStep.ENDED,
    ];

    for (const step of allowedSteps) {
      vi.clearAllMocks();
      const linkStore = createMockLinkDetailStore(step);

      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`,
      }));

      const { unmount } = render(DetailFlowProtected, {
        props: { linkStore, children: snip },
      });

      flushSync();

      expect(screen.getByTestId("slot")).toBeInTheDocument();
      expect(
        (goto as unknown as { mock: { calls: unknown[] } }).mock.calls.length,
      ).toBe(0);

      unmount();
    }
  });

  it("redirects when authState.account is null", async () => {
    mockAuthState.account = null;
    const linkStore = createMockLinkDetailStore(LinkStep.ACTIVE);

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`,
    }));

    render(DetailFlowProtected, {
      props: { linkStore, children: snip },
    });

    flushSync();

    const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
    expect(gotoMock.calls.length).toBeGreaterThanOrEqual(1);
    expect(gotoMock.calls[0][0] as string).toBe("/links");
  });
});
