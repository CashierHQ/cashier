import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CashierWalletSignerAdapter } from '../CashierWalletSignerAdapter'

// ── Hoisted mock state ────────────────────────────────────────────────────────

const {
  mockIframeDestroy,
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
  const MockIframeTransport = vi.fn().mockImplementation(() => ({ destroy: mockIframeDestroy }))

  const mockRequestPermissions = vi.fn().mockResolvedValue(undefined)
  const mockGetAccounts = vi.fn().mockResolvedValue([
    { owner: { toText: () => 'owner-principal-text' } },
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
    MockIframeTransport.mockImplementation(() => ({ destroy: mockIframeDestroy }))
    MockSigner.mockImplementation(() => ({
      requestPermissions: mockRequestPermissions,
      getAccounts: mockGetAccounts,
    }))
    mockRequestPermissions.mockResolvedValue(undefined)
    mockGetAccounts.mockResolvedValue([{ owner: { toText: () => 'owner-principal-text' } }])
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
      const connectPromise = adapter.connect()

      fakePopup.closed = true
      vi.advanceTimersByTime(600)

      await expect(connectPromise).rejects.toThrow('closed before authentication')
      vi.useRealTimers()
    })

    it('rejects with timeout if login takes too long', async () => {
      vi.useFakeTimers()
      const fakePopup = { closed: false, postMessage: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)

      const adapter = makeAdapter()
      const connectPromise = adapter.connect()

      vi.advanceTimersByTime(5 * 60 * 1_000 + 100)

      await expect(connectPromise).rejects.toThrow('timed out')
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

      expect(mockIframeDestroy).toHaveBeenCalledOnce()
      expect(await adapter.isConnected()).toBe(false)
      await expect(adapter.getPrincipal()).rejects.toThrow('Not connected')
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
