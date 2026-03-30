import { describe, it, expect, vi, beforeEach } from 'vitest'

// AuthClient mock factory — each vi.resetModules() call gets a fresh mock
const mockLogin = vi.fn()
const mockLogout = vi.fn()
const mockGetIdentity = vi.fn()
const mockIsAuthenticated = vi.fn()

const mockAuthClientInstance = {
  login: mockLogin,
  logout: mockLogout,
  getIdentity: mockGetIdentity,
  isAuthenticated: mockIsAuthenticated,
}

vi.mock('@dfinity/auth-client', () => ({
  AuthClient: {
    create: vi.fn(),
  },
}))

describe('identity-manager', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  // ─── initAuthClient() ────────────────────────────────────────────────────────

  describe('initAuthClient()', () => {
    it('calls AuthClient.create() on first invocation', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      vi.mocked(AuthClient.create).mockResolvedValue(mockAuthClientInstance as never)

      const { initAuthClient } = await import('../identity-manager')
      const result = await initAuthClient()

      expect(AuthClient.create).toHaveBeenCalledOnce()
      expect(result).toBe(mockAuthClientInstance)
    })

    it('returns the cached instance on subsequent calls (singleton)', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      vi.mocked(AuthClient.create).mockResolvedValue(mockAuthClientInstance as never)

      const { initAuthClient } = await import('../identity-manager')
      const first = await initAuthClient()
      const second = await initAuthClient()

      expect(AuthClient.create).toHaveBeenCalledOnce()
      expect(first).toBe(second)
    })

    it('throws a wrapped error when AuthClient.create() rejects', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      vi.mocked(AuthClient.create).mockRejectedValue(new Error('init failed'))

      const { initAuthClient } = await import('../identity-manager')
      await expect(initAuthClient()).rejects.toThrow('AuthClient init failed')
    })
  })

  // ─── login() ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('calls ac.login() with identityProvider and resolves { ok: true } via onSuccess', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      mockLogin.mockImplementation(({ onSuccess }: { onSuccess: () => void }) => onSuccess())
      vi.mocked(AuthClient.create).mockResolvedValue(mockAuthClientInstance as never)

      const { login } = await import('../identity-manager')
      const result = await login()

      expect(result).toEqual({ ok: true })
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ identityProvider: 'https://id.ai' }),
      )
    })

    it('passes derivationOrigin when provided', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      mockLogin.mockImplementation(({ onSuccess }: { onSuccess: () => void }) => onSuccess())
      vi.mocked(AuthClient.create).mockResolvedValue(mockAuthClientInstance as never)

      const { login } = await import('../identity-manager')
      await login('https://my-dapp.example')

      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ derivationOrigin: 'https://my-dapp.example' }),
      )
    })

    it('does not include derivationOrigin when not provided', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      mockLogin.mockImplementation(({ onSuccess }: { onSuccess: () => void }) => onSuccess())
      vi.mocked(AuthClient.create).mockResolvedValue(mockAuthClientInstance as never)

      const { login } = await import('../identity-manager')
      await login()

      const callArg = mockLogin.mock.calls[0][0]
      expect(callArg).not.toHaveProperty('derivationOrigin')
    })

    it('resolves { ok: false, error } via onError callback', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      mockLogin.mockImplementation(({ onError }: { onError: (e: string) => void }) =>
        onError('user cancelled'),
      )
      vi.mocked(AuthClient.create).mockResolvedValue(mockAuthClientInstance as never)

      const { login } = await import('../identity-manager')
      const result = await login()

      expect(result).toEqual({ ok: false, error: 'user cancelled' })
    })

    it('resolves { ok: false } when initAuthClient fails', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      vi.mocked(AuthClient.create).mockRejectedValue(new Error('no storage'))

      const { login } = await import('../identity-manager')
      const result = await login()

      expect(result.ok).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // ─── logout() ────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('calls ac.logout()', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      mockLogout.mockResolvedValue(undefined)
      vi.mocked(AuthClient.create).mockResolvedValue(mockAuthClientInstance as never)

      const { initAuthClient, logout } = await import('../identity-manager')
      await initAuthClient()
      await logout()

      expect(mockLogout).toHaveBeenCalledOnce()
    })
  })

  // ─── getIdentity() ───────────────────────────────────────────────────────────

  describe('getIdentity()', () => {
    it('returns null before initAuthClient is called', async () => {
      const { getIdentity } = await import('../identity-manager')
      expect(getIdentity()).toBeNull()
    })

    it('returns authClient.getIdentity() after initialization', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      const fakeIdentity = { getPrincipal: () => ({ toText: () => 'abc' }) }
      mockGetIdentity.mockReturnValue(fakeIdentity)
      vi.mocked(AuthClient.create).mockResolvedValue(mockAuthClientInstance as never)

      const { initAuthClient, getIdentity } = await import('../identity-manager')
      await initAuthClient()

      expect(getIdentity()).toBe(fakeIdentity)
    })
  })

  // ─── refreshAuthClient() ─────────────────────────────────────────────────────

  describe('refreshAuthClient()', () => {
    it('clears the cached instance and re-creates via AuthClient.create()', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      vi.mocked(AuthClient.create).mockResolvedValue(mockAuthClientInstance as never)

      const { initAuthClient, refreshAuthClient } = await import('../identity-manager')

      await initAuthClient()
      expect(AuthClient.create).toHaveBeenCalledTimes(1)

      await refreshAuthClient()
      expect(AuthClient.create).toHaveBeenCalledTimes(2)
    })
  })

  // ─── isAuthenticated() ───────────────────────────────────────────────────────

  describe('isAuthenticated()', () => {
    it('returns false when no authClient has been initialized', async () => {
      const { isAuthenticated } = await import('../identity-manager')
      await expect(isAuthenticated()).resolves.toBe(false)
    })

    it('delegates to authClient.isAuthenticated()', async () => {
      const { AuthClient } = await import('@dfinity/auth-client')
      mockIsAuthenticated.mockResolvedValue(true)
      vi.mocked(AuthClient.create).mockResolvedValue(mockAuthClientInstance as never)

      const { initAuthClient, isAuthenticated } = await import('../identity-manager')
      await initAuthClient()

      await expect(isAuthenticated()).resolves.toBe(true)
      expect(mockIsAuthenticated).toHaveBeenCalledOnce()
    })
  })
})
