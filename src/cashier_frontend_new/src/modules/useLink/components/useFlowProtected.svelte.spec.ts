// @vitest-environment jsdom
import { expect, vi, beforeEach, describe, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet, flushSync } from 'svelte';

// Mock SvelteKit navigation + paths before importing the component
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({ resolve: (p: string) => p }));

// Mock page state
const mockPage = vi.hoisted(() => {
  return {
    url: {
      pathname: '/link/test-link-id'
    }
  };
});

vi.mock('$app/state', () => ({
  page: mockPage
}));

// Mock auth state
const mockAuthState = vi.hoisted(() => {
  return {
    account: {
      owner: 'test-owner-principal'
    } as { owner: string } | null,
    setOnLogout: vi.fn(),
    setOnLogin: vi.fn()
  };
});

vi.mock('$modules/auth/state/auth.svelte', () => ({
  authState: mockAuthState
}));

// Mock userProfile
const mockUserProfile = vi.hoisted(() => {
  return {
    isReady: vi.fn(() => true),
    isLoggedIn: vi.fn(() => true)
  };
});

vi.mock('$modules/shared/services/userProfile.svelte', () => ({
  userProfile: mockUserProfile
}));

import UseFlowProtected from './useFlowProtected.svelte';
import type { UserLinkStore } from '../state/userLinkStore.svelte';
import { goto } from '$app/navigation';
import { LinkState } from '$modules/links/types/link/linkState';
import { LinkUserState } from '$modules/links/types/link/linkUserState';

// Helper to create a mocked userStore
function createMockUserLinkStore(
  linkState: string = LinkState.ACTIVE,
  linkUserState: string | null = null,
  isLoading: boolean = false,
  hasLink: boolean = true
) {
  return {
    isLoading,
    link: hasLink ? {
      state: linkState
    } : null,
    query: {
      data: linkUserState ? {
        link_user_state: linkUserState
      } : null
    }
  } as unknown as UserLinkStore;
}

describe('UseFlowProtected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to defaults
    mockAuthState.account = { owner: 'test-owner-principal' };
    mockUserProfile.isReady.mockReturnValue(true);
    mockUserProfile.isLoggedIn.mockReturnValue(true);
    mockPage.url.pathname = '/link/test-link-id';
  });

  it('renders children when link is loaded and not loading', async () => {
    const userStore = createMockUserLinkStore();

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`
    }));

    render(UseFlowProtected, {
      props: { userStore, children: snip, linkId: 'test-link-id' }
    });

    flushSync();

    expect(screen.getByTestId('slot')).toBeInTheDocument();
  });

  it('shows loading state when userStore is loading', async () => {
    const userStore = createMockUserLinkStore(LinkState.ACTIVE, null, true);

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`
    }));

    render(UseFlowProtected, {
      props: { userStore, children: snip, linkId: 'test-link-id' }
    });

    flushSync();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('does not render when link is null', async () => {
    const userStore = createMockUserLinkStore(LinkState.ACTIVE, null, false, false);

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`
    }));

    render(UseFlowProtected, {
      props: { userStore, children: snip, linkId: 'test-link-id' }
    });

    flushSync();

    expect(screen.queryByTestId('slot')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('sets onLogout and onLogin handlers', async () => {
    const userStore = createMockUserLinkStore();

    const snip = createRawSnippet(() => ({
      render: () => `<div data-testid="slot">child</div>`
    }));

    render(UseFlowProtected, {
      props: { userStore, children: snip, linkId: 'test-link-id' }
    });

    flushSync();

    expect(mockAuthState.setOnLogout).toHaveBeenCalled();
    expect(mockAuthState.setOnLogin).toHaveBeenCalled();
  });

  describe('redirect logic', () => {
    it('redirects to landing when on /use page and not logged in', async () => {
      mockUserProfile.isLoggedIn.mockReturnValue(false);
      mockPage.url.pathname = '/link/test-link-id/use';

      const userStore = createMockUserLinkStore();
      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`
      }));

      render(UseFlowProtected, {
        props: { userStore, children: snip, linkId: 'test-link-id' }
      });

      flushSync();

      const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
      expect(gotoMock.calls.length).toBeGreaterThanOrEqual(1);
      expect((gotoMock.calls[0][0] as string)).toBe('/link/test-link-id');
    });

    it('redirects to /use when on landing page, logged in, and link is active', async () => {
      mockUserProfile.isLoggedIn.mockReturnValue(true);
      mockPage.url.pathname = '/link/test-link-id';

      const userStore = createMockUserLinkStore(LinkState.ACTIVE);
      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`
      }));

      render(UseFlowProtected, {
        props: { userStore, children: snip, linkId: 'test-link-id' }
      });

      flushSync();

      const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
      expect(gotoMock.calls.length).toBeGreaterThanOrEqual(1);
      expect((gotoMock.calls[0][0] as string)).toBe('/link/test-link-id/use');
    });

    it('redirects to /use when on landing page, logged in, link is inactive, and user is completed', async () => {
      mockUserProfile.isLoggedIn.mockReturnValue(true);
      mockPage.url.pathname = '/link/test-link-id';

      const userStore = createMockUserLinkStore(
        LinkState.INACTIVE,
        LinkUserState.COMPLETED
      );
      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`
      }));

      render(UseFlowProtected, {
        props: { userStore, children: snip, linkId: 'test-link-id' }
      });

      flushSync();

      const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
      expect(gotoMock.calls.length).toBeGreaterThanOrEqual(1);
      expect((gotoMock.calls[0][0] as string)).toBe('/link/test-link-id/use');
    });

    it('does not redirect when on landing page, logged in, link is inactive, and user is not completed', async () => {
      mockUserProfile.isLoggedIn.mockReturnValue(true);
      mockPage.url.pathname = '/link/test-link-id';

      const userStore = createMockUserLinkStore(LinkState.INACTIVE, null);
      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`
      }));

      render(UseFlowProtected, {
        props: { userStore, children: snip, linkId: 'test-link-id' }
      });

      flushSync();

      const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
      expect(gotoMock.calls.length).toBe(0);
    });

    it('does not redirect when on landing page, logged in, link is ended, and user is not completed', async () => {
      mockUserProfile.isLoggedIn.mockReturnValue(true);
      mockPage.url.pathname = '/link/test-link-id';

      const userStore = createMockUserLinkStore(LinkState.INACTIVE_ENDED, null);
      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`
      }));

      render(UseFlowProtected, {
        props: { userStore, children: snip, linkId: 'test-link-id' }
      });

      flushSync();

      const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
      expect(gotoMock.calls.length).toBe(0);
    });

    it('does not redirect when userProfile is not ready', async () => {
      mockUserProfile.isReady.mockReturnValue(false);
      mockUserProfile.isLoggedIn.mockReturnValue(true);
      mockPage.url.pathname = '/link/test-link-id';

      const userStore = createMockUserLinkStore(LinkState.ACTIVE);
      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`
      }));

      render(UseFlowProtected, {
        props: { userStore, children: snip, linkId: 'test-link-id' }
      });

      flushSync();

      const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
      expect(gotoMock.calls.length).toBe(0);
    });

    it('does not redirect when userStore is loading', async () => {
      mockUserProfile.isLoggedIn.mockReturnValue(true);
      mockPage.url.pathname = '/link/test-link-id';

      const userStore = createMockUserLinkStore(LinkState.ACTIVE, null, true);
      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`
      }));

      render(UseFlowProtected, {
        props: { userStore, children: snip, linkId: 'test-link-id' }
      });

      flushSync();

      const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
      expect(gotoMock.calls.length).toBe(0);
    });

    it('does not redirect when link is null', async () => {
      mockUserProfile.isLoggedIn.mockReturnValue(true);
      mockPage.url.pathname = '/link/test-link-id';

      const userStore = createMockUserLinkStore(LinkState.ACTIVE, null, false, false);
      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`
      }));

      render(UseFlowProtected, {
        props: { userStore, children: snip, linkId: 'test-link-id' }
      });

      flushSync();

      const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
      expect(gotoMock.calls.length).toBe(0);
    });

    it('stays on /use page when logged in and link is active', async () => {
      mockUserProfile.isLoggedIn.mockReturnValue(true);
      mockPage.url.pathname = '/link/test-link-id/use';

      const userStore = createMockUserLinkStore(LinkState.ACTIVE);
      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`
      }));

      render(UseFlowProtected, {
        props: { userStore, children: snip, linkId: 'test-link-id' }
      });

      flushSync();

      const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
      expect(gotoMock.calls.length).toBe(0);
    });

    it('stays on /use page when logged in, link is inactive, and user is completed', async () => {
      mockUserProfile.isLoggedIn.mockReturnValue(true);
      mockPage.url.pathname = '/link/test-link-id/use';

      const userStore = createMockUserLinkStore(
        LinkState.INACTIVE,
        LinkUserState.COMPLETED
      );
      const snip = createRawSnippet(() => ({
        render: () => `<div data-testid="slot">child</div>`
      }));

      render(UseFlowProtected, {
        props: { userStore, children: snip, linkId: 'test-link-id' }
      });

      flushSync();

      const gotoMock = (goto as unknown as { mock: { calls: unknown[][] } }).mock;
      expect(gotoMock.calls.length).toBe(0);
    });
  });
});
