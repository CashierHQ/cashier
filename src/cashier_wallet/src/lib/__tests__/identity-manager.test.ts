import { describe, it, expect, vi, beforeEach } from 'vitest'

// AuthClient v7 API: constructor-based, no static create()
// Mock methods shared across all test instances
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
const mockGetIdentity = vi.fn()
const mockIsAuthenticated = vi.fn()

// Hoist FakeAuthClient so vi.mock factory can close over it
const { MockAuthClient } = vi.hoisted(() => {
  // A vi.fn() that acts as a constructor — returns instances with the mock methods
  const MockAuthClient = vi.fn().mockImplementation(() => ({
    signIn: mockSignIn,
    signOut: mockSignOut,
    getIdentity: mockGetIdentity,
    isAuthenticated: mockIsAuthenticated,
  }))
  return { MockAuthClient }
})

vi.mock('@icp-sdk/auth/client', () => ({
  AuthClient: MockAuthClient,
}))

describe('identity-manager', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    // Default: getIdentity resolves with a fake anonymous identity
    MockAuthClient.mockImplementation(() => ({
      signIn: mockSignIn,
      signOut: mockSignOut,
      getIdentity: mockGetIdentity,
      isAuthenticated: mockIsAuthenticated,
    }))
    mockGetIdentity.mockResolvedValue({ getPrincipal: () => ({ toText: () => '2vxsx-fae' }) })
  })

  // ─── initAuthClient() ────────────────────────────────────────────────────────

  describe('initAuthClient()', () => {
    it('constructs AuthClient on first invocation', async () => {
      const { initAuthClient } = await import('../identity-manager')
      const result = await initAuthClient()

      expect(MockAuthClient).toHaveBeenCalledOnce()
      expect(result).toBeDefined()
    })

    it('returns the cached instance on subsequent calls (singleton)', async () => {
      const { initAuthClient } = await import('../identity-manager')
      const first = await initAuthClient()
      const second = await initAuthClient()

      expect(MockAuthClient).toHaveBeenCalledOnce()
      expect(first).toBe(second)
    })

    it('throws a wrapped error when getIdentity() rejects during init', async () => {
      mockGetIdentity.mockRejectedValue(new Error('storage read failed'))

      const { initAuthClient } = await import('../identity-manager')
      await expect(initAuthClient()).rejects.toThrow('AuthClient init failed')
    })
  })

  // ─── login() ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('calls ac.signIn() and resolves { ok: true } on success', async () => {
      const fakeIdentity = { getPrincipal: () => ({ toText: () => 'user-principal' }) }
      mockSignIn.mockResolvedValue(fakeIdentity)

      const { login } = await import('../identity-manager')
      const result = await login()

      expect(result).toEqual({ ok: true })
      expect(mockSignIn).toHaveBeenCalledOnce()
    })

    it('passes derivationOrigin via a new AuthClient when provided', async () => {
      const fakeIdentity = { getPrincipal: () => ({ toText: () => 'user-principal' }) }
      mockSignIn.mockResolvedValue(fakeIdentity)
      mockGetIdentity.mockResolvedValue(fakeIdentity)

      const { login } = await import('../identity-manager')
      await login('https://my-dapp.example')

      // Should have constructed AuthClient twice: once on initAuthClient, once with derivationOrigin
      const calls = MockAuthClient.mock.calls as unknown[][]
      const withDerivation = calls.find(
        (args) => (args[0] as { derivationOrigin?: string })?.derivationOrigin === 'https://my-dapp.example'
      )
      expect(withDerivation).toBeDefined()
    })

    it('resolves { ok: false, error } when signIn throws', async () => {
      mockSignIn.mockRejectedValue(new Error('user cancelled'))

      const { login } = await import('../identity-manager')
      const result = await login()

      expect(result.ok).toBe(false)
      expect(result.error).toContain('user cancelled')
    })

    it('resolves { ok: false } when initAuthClient fails', async () => {
      mockGetIdentity.mockRejectedValue(new Error('no storage'))

      const { login } = await import('../identity-manager')
      const result = await login()

      expect(result.ok).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // ─── logout() ────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('calls ac.signOut()', async () => {
      mockSignOut.mockResolvedValue(undefined)

      const { initAuthClient, logout } = await import('../identity-manager')
      await initAuthClient()
      await logout()

      expect(mockSignOut).toHaveBeenCalledOnce()
    })
  })

  // ─── getIdentity() ───────────────────────────────────────────────────────────

  describe('getIdentity()', () => {
    it('returns null before initAuthClient is called', async () => {
      const { getIdentity } = await import('../identity-manager')
      expect(getIdentity()).toBeNull()
    })

    it('returns cached identity after initialization', async () => {
      const fakeIdentity = { getPrincipal: () => ({ toText: () => 'abc' }) }
      mockGetIdentity.mockResolvedValue(fakeIdentity)

      const { initAuthClient, getIdentity } = await import('../identity-manager')
      await initAuthClient()

      expect(getIdentity()).toBe(fakeIdentity)
    })
  })

  // ─── refreshAuthClient() ─────────────────────────────────────────────────────

  describe('refreshAuthClient()', () => {
    it('clears the cached instance and re-constructs AuthClient', async () => {
      const { initAuthClient, refreshAuthClient } = await import('../identity-manager')

      await initAuthClient()
      expect(MockAuthClient).toHaveBeenCalledTimes(1)

      await refreshAuthClient()
      expect(MockAuthClient).toHaveBeenCalledTimes(2)
    })
  })

  // ─── isAuthenticated() ───────────────────────────────────────────────────────

  describe('isAuthenticated()', () => {
    it('returns false when no authClient has been initialized', async () => {
      const { isAuthenticated } = await import('../identity-manager')
      await expect(isAuthenticated()).resolves.toBe(false)
    })

    it('delegates to authClient.isAuthenticated()', async () => {
      mockIsAuthenticated.mockReturnValue(true)

      const { initAuthClient, isAuthenticated } = await import('../identity-manager')
      await initAuthClient()

      await expect(isAuthenticated()).resolves.toBe(true)
      expect(mockIsAuthenticated).toHaveBeenCalledOnce()
    })
  })
})
