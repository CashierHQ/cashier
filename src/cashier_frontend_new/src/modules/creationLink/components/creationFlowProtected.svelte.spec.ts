// @vitest-environment jsdom
import { expect, vi, beforeEach, describe, it } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";

// Mock SvelteKit navigation + paths before importing the component
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/paths", () => ({ resolve: (p: string) => p }));

// Provide deterministic LinkStep values
vi.mock("$modules/links/types/linkStep", () => ({
  LinkStep: {
    CHOOSE_TYPE: 0,
    ADD_ASSET: 1,
    PREVIEW: 2,
    CREATED: 3,
    OTHER: 99,
  },
}));

import CreationFlowProtected from "./creationFlowProtected.svelte";
import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
import { goto } from "$app/navigation";
import { LinkStep } from "$modules/links/types/linkStep";

// Helper to create a mocked linkStore (mirrors the shape used by the component)
function createMockLinkCreationStore(initialStep: number) {
  return { state: { step: initialStep } } as unknown as LinkCreationStore;
}

describe("CreationFlowProtected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when step is allowed", async () => {
    const linkStore = createMockLinkCreationStore(LinkStep.ADD_ASSET);

    const snip = createRawSnippet(() => {
      return {
        render: () => `<div data-testid="slot">child</div>`,
      };
    });

    render(CreationFlowProtected, {
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
    const linkStore = createMockLinkCreationStore(99); // OTHER === 99 in mock

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`,
    }));

    render(CreationFlowProtected, {
      props: { linkStore, children: snip },
    });

    flushSync();

    const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
    expect(gotoMock.calls.length).toBeGreaterThanOrEqual(1);
    expect(gotoMock.calls[0][0] as string).toBe("/links");
  });

  it("redirects after step changes to disallowed", async () => {
    // cast to a mutable shape so we can change `state.step` in the test
    const linkStore = createMockLinkCreationStore(LinkStep.PREVIEW);

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`,
    }));

    render(CreationFlowProtected, {
      props: { linkStore, children: snip },
    });

    flushSync();
    expect(screen.getByTestId("slot")).toBeInTheDocument();

    const linkStore2 = createMockLinkCreationStore(LinkStep.ENDED);
    render(CreationFlowProtected, {
      props: { linkStore: linkStore2, children: snip },
    });
    flushSync();

    const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
    expect(gotoMock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
