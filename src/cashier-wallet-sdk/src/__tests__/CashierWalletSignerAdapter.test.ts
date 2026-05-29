import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CashierWalletSignerAdapter } from '../CashierWalletSignerAdapter'

// ── Hoisted mock state ────────────────────────────────────────────────────────

const {
  mockIframeDestroy,
  mockRequestWalletLogout,
  MockIframeTransport,
  mockRequestPermissions,
  mockGetAccounts,
  MockSigner,
  mockSignerAgentCreateSync,
  mockSignerAgentInstance,
  mockHttpAgentCreateSync,
  mockHttpAgentInstance,
} = vi.hoisted(() => {
  const mockIframeDestroy = vi.fn()
  const mockRequestWalletLogout = vi.fn().mockResolvedValue(undefined)
  const MockIframeTransport = vi.fn().mockImplementation(() => ({
    destroy: mockIframeDestroy,
    requestWalletLogout: mockRequestWalletLogout,
  }))

  const mockRequestPermissions = vi.fn().mockResolvedValue(undefined)
  const mockGetAccounts = vi.fn().mockResolvedValue([
    { owner: { toText: () => 'owner-principal-text', isAnonymous: () => false } },
  ])
  const MockSigner = vi.fn().mockImplementation(() => ({
    requestPermissions: mockRequestPermissions,
    getAccounts: mockGetAccounts,
  }))

  const mockSignerAgentInstance = {}
  const mockSignerAgentCreateSync = vi.fn(() => mockSignerAgentInstance)

  const mockHttpAgentInstance = {}
  const mockHttpAgentCreateSync = vi.fn(() => mockHttpAgentInstance)

  return {
    mockIframeDestroy,
    mockRequestWalletLogout,
    MockIframeTransport,
    mockRequestPermissions,
    mockGetAccounts,
    MockSigner,
    mockSignerAgentCreateSync,
    mockSignerAgentInstance,
    mockHttpAgentCreateSync,
    mockHttpAgentInstance,
  }
})

// ── Mock base class and external dependencies ─────────────────────────────────

// FakeBaseSignerAdapter must be hoisted alongside `vi.mock` because
// `vi.mock(...)` is itself hoisted to the top of the module. A plain
// top-level `class` declaration lives in the temporal dead zone until
// initialisation order reaches it, so referencing it from the mock
// factory throws "Cannot access 'FakeBaseSignerAdapter' before initialization".
const { FakeBaseSignerAdapter, mockSuperDisconnectInternal, mockSuperCleanupInternal, mockSuperOnDispose } = vi.hoisted(() => {
  const mockSuperDisconnectInternal = vi.fn().mockResolvedValue(undefined)
  const mockSuperCleanupInternal = vi.fn()
  const mockSuperOnDispose = vi.fn().mockResolvedValue(undefined)

  class FakeBaseSignerAdapter {
    protected config: Record<string, unknown>
    protected signer: unknown = null
    protected signerAgent: unknown = null
    protected agent: unknown = null
    // PNP's BaseSignerAdapter computes this as `${adapter.id}_principal` —
    // the adapter under test reads it via `this.principalStorageKey`.
    protected principalStorageKey = 'cashierWallet_principal'

    constructor(args: { config: Record<string, unknown> }) {
      this.config = args.config
    }

    protected createActorWithAgent<T>(
      _agent: unknown,
      _canisterId: string,
      _idl: unknown,
    ): T {
      return {} as T
    }

    protected async disconnectInternal(): Promise<void> {
      await mockSuperDisconnectInternal()
    }

    protected cleanupInternal(): void {
      mockSuperCleanupInternal()
    }

    protected async onDispose(): Promise<void> {
      await mockSuperOnDispose()
    }
  }
  return { FakeBaseSignerAdapter, mockSuperDisconnectInternal, mockSuperCleanupInternal, mockSuperOnDispose }
})

vi.mock('@windoge98/plug-n-play', () => ({
  BaseSignerAdapter: FakeBaseSignerAdapter,
}))

vi.mock('../IframeTransport', () => ({
  IframeTransport: MockIframeTransport,
}))

vi.mock('@icp-sdk/signer', () => ({
  Signer: MockSigner,
}))

// Use `vi.fn(() => obj)` rather than `vi.fn().mockReturnValue(obj)` so that
// `vi.restoreAllMocks()` in `afterEach` falls back to this initial
// implementation between tests instead of wiping it entirely.
vi.mock('@icp-sdk/signer/agent', () => ({
  SignerAgent: {
    createSync: mockSignerAgentCreateSync,
  },
}))

vi.mock('@icp-sdk/core/agent', () => ({
  HttpAgent: {
    createSync: mockHttpAgentCreateSync,
  },
  Actor: { createActor: vi.fn() },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const WALLET_ORIGIN = 'https://wallet.example.com'

function makeAdapter(config: Record<string, unknown> = { walletOrigin: WALLET_ORIGIN }) {
  return new CashierWalletSignerAdapter({ config } as never)
}

function sendMessage(data: unknown, origin = WALLET_ORIGIN) {
  window.dispatchEvent(new MessageEvent('message', { data, origin }))
}

async function connectAdapter(adapter: CashierWalletSignerAdapter) {
  const fakePopup = { closed: false, postMessage: vi.fn() }
  vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)

  const connectPromise = adapter.connect()
  await new Promise((r) => setTimeout(r, 0))
  sendMessage({ type: 'wallet_auth_complete', principal: 'owner-principal-text' })

  return connectPromise
}

describe('CashierWalletSignerAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockRequestWalletLogout.mockResolvedValue(undefined)
    MockIframeTransport.mockImplementation(() => ({
      destroy: mockIframeDestroy,
      requestWalletLogout: mockRequestWalletLogout,
    }))
    MockSigner.mockImplementation(() => ({
      requestPermissions: mockRequestPermissions,
      getAccounts: mockGetAccounts,
    }))
    // Silent reconnect is exercised by Phase 1's connect() flow before the
    // popup path. To keep popup-path tests deterministic, default the silent
    // attempt to FAIL (first requestPermissions call rejects) so connect()
    // falls through to the popup flow. The popup flow then re-calls
    // requestPermissions, which resolves (the .mockResolvedValue below).
    // Tests that want silent-success override these mocks before connecting.
    mockRequestPermissions.mockReset()
    mockRequestPermissions
      .mockRejectedValueOnce(new Error('silent path disabled in default test setup'))
      .mockResolvedValue(undefined)
    mockGetAccounts.mockResolvedValue([{ owner: { toText: () => 'owner-principal-text', isAnonymous: () => false } }])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── constructor ─────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('throws if walletOrigin is missing from config', () => {
      expect(() => new CashierWalletSignerAdapter({ config: {} } as never)).toThrow(
        'walletOrigin is required',
      )
    })

    it('throws if config is null', () => {
      expect(() => new CashierWalletSignerAdapter({ config: null } as never)).toThrow(
        'walletOrigin is required',
      )
    })

    it('does not throw when walletOrigin is provided', () => {
      expect(() => makeAdapter()).not.toThrow()
    })
  })

  // ─── isConnected() ───────────────────────────────────────────────────────────

  describe('isConnected()', () => {
    it('returns false before connect()', async () => {
      const adapter = makeAdapter()
      await expect(adapter.isConnected()).resolves.toBe(false)
    })

    it('returns true after successful connect()', async () => {
      const adapter = makeAdapter()
      await connectAdapter(adapter)
      await expect(adapter.isConnected()).resolves.toBe(true)
    })
  })

  // ─── getPrincipal() ──────────────────────────────────────────────────────────

  describe('getPrincipal()', () => {
    it('throws "Not connected" when called before connect()', async () => {
      const adapter = makeAdapter()
      await expect(adapter.getPrincipal()).rejects.toThrow('Not connected')
    })

    it('returns the principal text after connect()', async () => {
      const adapter = makeAdapter()
      await connectAdapter(adapter)
      await expect(adapter.getPrincipal()).resolves.toBe('owner-principal-text')
    })
  })

  // ─── connect() ───────────────────────────────────────────────────────────────

  describe('connect()', () => {
    it('opens a popup with the wallet URL', async () => {
      const openSpy = vi.spyOn(window, 'open').mockReturnValue({
        closed: false,
        postMessage: vi.fn(),
      } as unknown as Window)

      const adapter = makeAdapter()
      const connectPromise = adapter.connect()
      await new Promise((r) => setTimeout(r, 0))
      sendMessage({ type: 'wallet_auth_complete', principal: 'p' })
      await connectPromise

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining(WALLET_ORIGIN),
        '_blank',
      )
    })

    it('rejects if the login popup is blocked', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      const adapter = makeAdapter()
      await expect(adapter.connect()).rejects.toThrow('login popup was blocked')
    })

    it('rejects if popup is closed before auth completes', async () => {
      vi.useFakeTimers()
      const fakePopup = { closed: false, postMessage: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)

      const adapter = makeAdapter()
      // Capture rejection eagerly to avoid a transient unhandled-rejection
      // window between the timer firing and `await expect.rejects` attaching.
      const settled = adapter.connect().then(
        () => ({ ok: true as const }),
        (err: Error) => ({ ok: false as const, err }),
      )

      // Drain microtasks so silent rejects + popup-flow timers register
      await vi.advanceTimersByTimeAsync(0)

      fakePopup.closed = true
      await vi.advanceTimersByTimeAsync(600)

      const outcome = await settled
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) {
        expect(outcome.err.message).toContain('closed before authentication')
      }
      vi.useRealTimers()
    })

    it('rejects with timeout if login takes too long', async () => {
      vi.useFakeTimers()
      const fakePopup = { closed: false, postMessage: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)

      const adapter = makeAdapter()
      const settled = adapter.connect().then(
        () => ({ ok: true as const }),
        (err: Error) => ({ ok: false as const, err }),
      )

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(5 * 60 * 1_000 + 100)

      const outcome = await settled
      expect(outcome.ok).toBe(false)
      if (!outcome.ok) {
        expect(outcome.err.message).toContain('timed out')
      }
      vi.useRealTimers()
    })

    it('rejects when wallet_auth_complete arrives without a principal', async () => {
      vi.spyOn(window, 'open').mockReturnValue({
        closed: false,
        postMessage: vi.fn(),
      } as unknown as Window)

      const adapter = makeAdapter()
      const connectPromise = adapter.connect()

      await new Promise((r) => setTimeout(r, 0))
      sendMessage({ type: 'wallet_auth_complete', principal: '' })

      await expect(connectPromise).rejects.toThrow('without a principal')
    })

    it('returns account with owner and null subaccount', async () => {
      const adapter = makeAdapter()
      const result = await connectAdapter(adapter)
      expect(result).toEqual({ owner: 'owner-principal-text', subaccount: null })
    })

    it('requests icrc27_accounts and icrc49_call_canister permissions', async () => {
      const adapter = makeAdapter()
      await connectAdapter(adapter)

      expect(mockRequestPermissions).toHaveBeenCalledWith([
        { method: 'icrc27_accounts' },
        { method: 'icrc49_call_canister' },
      ])
    })
  })

  // ─── disconnectInternal() ────────────────────────────────────────────────────

  describe('disconnectInternal()', () => {
    it('destroys the iframe transport and clears state', async () => {
      const adapter = makeAdapter()
      await connectAdapter(adapter)

      expect(await adapter.isConnected()).toBe(true)

      await (adapter as unknown as { disconnectInternal(): Promise<void> }).disconnectInternal()

      // Two iframe.destroy() calls in this flow: (1) silent-attempt teardown
      // before the popup opens, (2) final disconnect.
      expect(mockIframeDestroy).toHaveBeenCalledTimes(2)
      expect(await adapter.isConnected()).toBe(false)
      await expect(adapter.getPrincipal()).rejects.toThrow('Not connected')
    })
  })

  // ─── silent reconnect ─────────────────────────────────────────────────────────

  describe('silent reconnect', () => {
    // Configure mocks so the silent path succeeds without falling through to popup.
    function setupSilentSuccess() {
      mockRequestPermissions.mockReset()
      mockRequestPermissions.mockResolvedValue(undefined)
      mockGetAccounts.mockResolvedValue([
        { owner: { toText: () => 'owner-principal-text', isAnonymous: () => false } },
      ])
    }

    it('skips popup when wallet returns accounts silently', async () => {
      setupSilentSuccess()
      const openSpy = vi.spyOn(window, 'open')

      const adapter = makeAdapter()
      const result = await adapter.connect()

      expect(openSpy).not.toHaveBeenCalled()
      expect(result.owner).toBe('owner-principal-text')
    })

    it('persists principal to localStorage on successful silent connect', async () => {
      setupSilentSuccess()
      const adapter = makeAdapter()
      await adapter.connect()

      expect(localStorage.getItem('cashierWallet_principal'))
        .toBe('owner-principal-text')
    })

    it('persists principal to localStorage on popup fallback connect', async () => {
      // Default setup makes silent fail → popup path runs.
      const adapter = makeAdapter()
      await connectAdapter(adapter)

      expect(localStorage.getItem('cashierWallet_principal'))
        .toBe('owner-principal-text')
    })

    it('clears localStorage on disconnect', async () => {
      setupSilentSuccess()
      const adapter = makeAdapter()
      await adapter.connect()
      await (adapter as unknown as { disconnectInternal(): Promise<void> }).disconnectInternal()

      expect(localStorage.getItem('cashierWallet_principal')).toBeNull()
    })

    it('falls through to popup when getAccounts returns empty (no owner)', async () => {
      mockRequestPermissions.mockReset()
      mockRequestPermissions.mockResolvedValue(undefined)
      mockGetAccounts.mockReset()
      mockGetAccounts
        .mockResolvedValueOnce([])           // silent: no accounts → null owner → fail
        .mockResolvedValue([
          { owner: { toText: () => 'owner-principal-text', isAnonymous: () => false } },
        ])                                   // popup: real owner

      const adapter = makeAdapter()
      const fakePopup = { closed: false, postMessage: vi.fn() }
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)

      const connectPromise = adapter.connect()
      // Let silent attempt settle and popup listeners register
      await new Promise((r) => setTimeout(r, 0))
      sendMessage({ type: 'wallet_auth_complete', principal: 'owner-principal-text' })
      await connectPromise

      expect(openSpy).toHaveBeenCalled()
    })
  })

  // ─── SignerAgent wiring ──────────────────────────────────────────────────────

  describe('SignerAgent wiring', () => {
    it('constructs SignerAgent with signer, account, and HttpAgent', async () => {
      const adapter = makeAdapter()
      await connectAdapter(adapter)

      expect(mockSignerAgentCreateSync).toHaveBeenCalledWith(
        expect.objectContaining({
          signer: expect.anything(),
          account: expect.anything(),
          agent: mockHttpAgentInstance,
        }),
      )
    })

    it('exposes signerAgent on the adapter for actor creation', async () => {
      const adapter = makeAdapter()
      await connectAdapter(adapter)

      const signerAgent = (adapter as unknown as { signerAgent: unknown }).signerAgent
      expect(signerAgent).toBe(mockSignerAgentInstance)
    })
  })
})
