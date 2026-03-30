import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WalletSDK } from '../WalletSDK'
import { UserRejectedError, NotConnectedError, ConsentTimeoutError } from '../errors'

// ── RpcClient class mock ──────────────────────────────────────────────────────
// Class-based mock avoids vi.hoisted hoisting ambiguity.
// Each `new RpcClient()` call stores the instance in `lastRpcInstance`.

let lastRpcInstance: {
  connect: ReturnType<typeof vi.fn>
  request: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
} | null = null

vi.mock('../RpcClient', () => ({
  RpcClient: class MockRpcClient {
    connect = vi.fn()
    request = vi.fn()
    destroy = vi.fn()
    constructor() {
      // capture for test access
      lastRpcInstance = this as unknown as typeof lastRpcInstance
    }
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const WALLET_ORIGIN = 'https://wallet.example.com'

function makeFakeIframe() {
  const listeners: Record<string, Array<(e: Event) => void>> = {}
  const fakeContentWindow = {} as Window

  const iframe = {
    src: '',
    style: { cssText: '' },
    title: '',
    contentWindow: fakeContentWindow,
    addEventListener: vi.fn((event: string, handler: (e: Event) => void, _opts?: unknown) => {
      listeners[event] = listeners[event] ?? []
      listeners[event].push(handler)
    }),
    remove: vi.fn(),
    _fireLoad: () => listeners['load']?.forEach((fn) => fn(new Event('load'))),
  }
  return iframe
}

function sendMessage(data: unknown, origin = WALLET_ORIGIN) {
  window.dispatchEvent(new MessageEvent('message', { data, origin }))
}

async function mountSdk(
  sdk: WalletSDK,
  container: { appendChild: ReturnType<typeof vi.fn> },
  fakeIframe: ReturnType<typeof makeFakeIframe>,
) {
  // Set up default request responses after the instance is created
  const mountPromise = sdk.mount(container as unknown as HTMLElement)
  // lastRpcInstance is now populated (new RpcClient was called inside mount)
  lastRpcInstance!.request.mockImplementation((method: string) => {
    if (method === 'connect') return Promise.resolve({})
    if (method === 'is_authenticated') return Promise.resolve({ authenticated: false })
    return Promise.resolve({})
  })
  fakeIframe._fireLoad()
  await mountPromise
}

describe('WalletSDK', () => {
  let fakeIframe: ReturnType<typeof makeFakeIframe>
  let container: { appendChild: ReturnType<typeof vi.fn> }
  let uuidCounter = 0

  beforeEach(() => {
    uuidCounter = 0
    lastRpcInstance = null
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      () => `uuid-${++uuidCounter}` as `${string}-${string}-${string}-${string}-${string}`,
    )
    fakeIframe = makeFakeIframe()
    vi.spyOn(document, 'createElement').mockReturnValue(fakeIframe as unknown as HTMLIFrameElement)
    container = { appendChild: vi.fn() }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── constructor ─────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('uses localhost:5177 as default walletOrigin', async () => {
      const sdk = new WalletSDK()
      const mountPromise = sdk.mount(container as unknown as HTMLElement)
      expect(fakeIframe.src).toBe('http://localhost:5177')
      lastRpcInstance!.request.mockRejectedValue(new Error('timeout'))
      fakeIframe._fireLoad()
      await mountPromise.catch(() => {})
    })

    it('accepts a custom walletOrigin', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)
      expect(fakeIframe.src).toBe(WALLET_ORIGIN)
    })
  })

  // ─── mount() ─────────────────────────────────────────────────────────────────

  describe('mount()', () => {
    it('creates an iframe, appends it to container, and resolves on handshake success', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)

      expect(fakeIframe.src).toBe(WALLET_ORIGIN)
      expect(container.appendChild).toHaveBeenCalledWith(fakeIframe)
      expect(lastRpcInstance!.connect).toHaveBeenCalledWith(fakeIframe.contentWindow)
      expect(lastRpcInstance!.request).toHaveBeenCalledWith('connect', undefined, 1_000)
    })

    it('is idempotent — second call is a no-op', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)

      const createElementSpy = document.createElement as ReturnType<typeof vi.fn>
      const callsBefore = createElementSpy.mock.calls.length

      await sdk.mount(container as unknown as HTMLElement)
      expect(createElementSpy.mock.calls.length).toBe(callsBefore)
    })

    it('retries handshake up to 5 times on failure then rejects', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      const mountPromise = sdk.mount(container as unknown as HTMLElement)
      lastRpcInstance!.request.mockRejectedValue(new Error('timeout'))
      fakeIframe._fireLoad()

      await expect(mountPromise).rejects.toThrow('handshake failed after retries')
      expect(lastRpcInstance!.request).toHaveBeenCalledTimes(5)
    })

    it('emits "connected" event after successful handshake', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      const connectedListener = vi.fn()
      sdk.on('connected', connectedListener)

      await mountSdk(sdk, container, fakeIframe)
      expect(connectedListener).toHaveBeenCalledOnce()
    })

    it('emits "authChange" with authenticated=true when session is active on mount', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      const authListener = vi.fn()
      sdk.on('authChange', authListener)

      const mountPromise = sdk.mount(container as unknown as HTMLElement)
      lastRpcInstance!.request.mockImplementation((method: string) => {
        if (method === 'connect') return Promise.resolve({})
        if (method === 'is_authenticated') return Promise.resolve({ authenticated: true })
        if (method === 'get_principal_internal') return Promise.resolve({ principal: 'abc-principal' })
        return Promise.resolve({})
      })
      fakeIframe._fireLoad()
      await mountPromise

      expect(authListener).toHaveBeenCalledWith({ authenticated: true, principal: 'abc-principal' })
    })
  })

  // ─── unmount() ───────────────────────────────────────────────────────────────

  describe('unmount()', () => {
    it('destroys the client, removes iframe, and emits "disconnected"', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)

      const disconnectedListener = vi.fn()
      sdk.on('disconnected', disconnectedListener)

      sdk.unmount()
      expect(lastRpcInstance!.destroy).toHaveBeenCalledOnce()
      expect(fakeIframe.remove).toHaveBeenCalledOnce()
      expect(disconnectedListener).toHaveBeenCalledOnce()
    })
  })

  // ─── login() ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('throws if window.open returns null (popup blocked)', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)
      await expect(sdk.login()).rejects.toThrow('popup was blocked')
    })

    it('resolves with principal when wallet_auth_complete message arrives', async () => {
      const fakePopup = { closed: false, postMessage: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)

      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)

      const loginPromise = sdk.login()
      sendMessage({ type: 'wallet_auth_complete', principal: 'user-principal-text' })

      await expect(loginPromise).resolves.toEqual({ principal: 'user-principal-text' })
    })

    it('rejects with UserRejectedError when popup is closed before auth', async () => {
      vi.useFakeTimers()
      const fakePopup = { closed: false, postMessage: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)

      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      const mountPromise = sdk.mount(container as unknown as HTMLElement)
      lastRpcInstance!.request.mockImplementation((method: string) => {
        if (method === 'connect') return Promise.resolve({})
        if (method === 'is_authenticated') return Promise.resolve({ authenticated: false })
        return Promise.resolve({})
      })
      fakeIframe._fireLoad()
      await mountPromise

      const loginPromise = sdk.login()
      fakePopup.closed = true
      vi.advanceTimersByTime(600)

      await expect(loginPromise).rejects.toBeInstanceOf(UserRejectedError)
      vi.useRealTimers()
    })

    it('ignores wallet_auth_complete from the wrong origin', async () => {
      vi.useFakeTimers()
      const fakePopup = { closed: false, postMessage: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)

      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      const mountPromise = sdk.mount(container as unknown as HTMLElement)
      lastRpcInstance!.request.mockImplementation((method: string) => {
        if (method === 'connect') return Promise.resolve({})
        if (method === 'is_authenticated') return Promise.resolve({ authenticated: false })
        return Promise.resolve({})
      })
      fakeIframe._fireLoad()
      await mountPromise

      const loginPromise = sdk.login()
      sendMessage({ type: 'wallet_auth_complete', principal: 'evil-principal' }, 'https://evil.com')

      fakePopup.closed = true
      vi.advanceTimersByTime(600)

      await expect(loginPromise).rejects.toBeInstanceOf(UserRejectedError)
      vi.useRealTimers()
    })

    it('emits authChange with authenticated=true on successful login', async () => {
      const fakePopup = { closed: false, postMessage: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)

      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)

      const authListener = vi.fn()
      sdk.on('authChange', authListener)

      const loginPromise = sdk.login()
      sendMessage({ type: 'wallet_auth_complete', principal: 'my-principal' })
      await loginPromise

      expect(authListener).toHaveBeenCalledWith({ authenticated: true, principal: 'my-principal' })
    })
  })

  // ─── isAuthenticated() ───────────────────────────────────────────────────────

  describe('isAuthenticated()', () => {
    it('throws NotConnectedError when not mounted', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await expect(sdk.isAuthenticated()).rejects.toBeInstanceOf(NotConnectedError)
    })

    it('delegates to client.request and returns authenticated boolean', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)

      lastRpcInstance!.request.mockResolvedValueOnce({ authenticated: true })
      await expect(sdk.isAuthenticated()).resolves.toBe(true)

      lastRpcInstance!.request.mockResolvedValueOnce({ authenticated: false })
      await expect(sdk.isAuthenticated()).resolves.toBe(false)
    })
  })

  // ─── logout() ────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('throws NotConnectedError when not mounted', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await expect(sdk.logout()).rejects.toBeInstanceOf(NotConnectedError)
    })

    it('calls client.request("logout") and emits authChange with authenticated=false', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)

      const authListener = vi.fn()
      sdk.on('authChange', authListener)

      lastRpcInstance!.request.mockResolvedValueOnce(undefined)
      await sdk.logout()

      expect(lastRpcInstance!.request).toHaveBeenCalledWith('logout')
      expect(authListener).toHaveBeenCalledWith({ authenticated: false, principal: '' })
    })
  })

  // ─── ping() ──────────────────────────────────────────────────────────────────

  describe('ping()', () => {
    it('throws NotConnectedError when not mounted', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await expect(sdk.ping()).rejects.toBeInstanceOf(NotConnectedError)
    })

    it('calls client.request("ping") and returns the result', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)

      lastRpcInstance!.request.mockResolvedValueOnce('pong')
      await expect(sdk.ping()).resolves.toBe('pong')
      expect(lastRpcInstance!.request).toHaveBeenCalledWith('ping')
    })
  })

  // ─── icrc1BalanceOf() ────────────────────────────────────────────────────────

  describe('icrc1BalanceOf()', () => {
    it('converts balance string response to bigint', async () => {
      // Mock window.open so the consent popup doesn't get blocked
      vi.spyOn(window, 'open').mockReturnValue({ closed: false } as unknown as Window)

      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)

      lastRpcInstance!.request
        .mockResolvedValueOnce({}) // consent_prepare
        .mockResolvedValueOnce({ balance: '1000000000' }) // actual method

      const balancePromise = sdk.icrc1BalanceOf('ryjl3-tyaaa-aaaaa-aaaba-cai', 'owner-principal')

      await new Promise((r) => setTimeout(r, 0))
      // randomUUID is called once: for the consentId (index 0)
      const consentId = vi.mocked(crypto.randomUUID).mock.results[0]?.value
      sendMessage({ type: 'consent_approved', consentId })

      const balance = await balancePromise
      expect(balance).toBe(1_000_000_000n)
      expect(typeof balance).toBe('bigint')
    })
  })

  // ─── icrc1Transfer() ─────────────────────────────────────────────────────────

  describe('icrc1Transfer()', () => {
    it('stringifies amount bigint and parses blockIndex response as bigint', async () => {
      vi.spyOn(window, 'open').mockReturnValue({ closed: false } as unknown as Window)

      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      await mountSdk(sdk, container, fakeIframe)

      lastRpcInstance!.request
        .mockResolvedValueOnce({}) // consent_prepare
        .mockResolvedValueOnce({ blockIndex: '42' }) // icrc1_transfer

      const transferPromise = sdk.icrc1Transfer({
        canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        to: 'recipient-principal',
        amount: 5_000_000n,
        fee: 10_000n,
        memo: undefined,
      })

      await new Promise((r) => setTimeout(r, 0))
      // randomUUID is called once: for the consentId (index 0)
      const consentId = vi.mocked(crypto.randomUUID).mock.results[0]?.value
      sendMessage({ type: 'consent_approved', consentId })

      const result = await transferPromise
      expect(result.blockIndex).toBe(42n)

      const lastCall = lastRpcInstance!.request.mock.calls.at(-1)
      expect(lastCall?.[1]).toMatchObject({ amount: '5000000' })
    })
  })

  // ─── _requestWithConsent() ───────────────────────────────────────────────────

  describe('_requestWithConsent() — consent popup', () => {
    it('rejects with ConsentTimeoutError when popup is closed without a decision', async () => {
      vi.useFakeTimers()
      const fakePopup = { closed: false, postMessage: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)

      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      const mountPromise = sdk.mount(container as unknown as HTMLElement)
      lastRpcInstance!.request.mockImplementation((method: string) => {
        if (method === 'connect') return Promise.resolve({})
        if (method === 'is_authenticated') return Promise.resolve({ authenticated: false })
        if (method === 'consent_prepare') return Promise.resolve({})
        return Promise.resolve({})
      })
      fakeIframe._fireLoad()
      await mountPromise

      const getPrincipalPromise = sdk.getPrincipal()
      await Promise.resolve()

      fakePopup.closed = true
      vi.advanceTimersByTime(600)

      await expect(getPrincipalPromise).rejects.toBeInstanceOf(ConsentTimeoutError)
      vi.useRealTimers()
    })

    it('rejects with UserRejectedError on consent_rejected message', async () => {
      vi.spyOn(window, 'open').mockReturnValue({ closed: false } as unknown as Window)

      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      const mountPromise = sdk.mount(container as unknown as HTMLElement)
      lastRpcInstance!.request.mockImplementation((method: string) => {
        if (method === 'connect') return Promise.resolve({})
        if (method === 'is_authenticated') return Promise.resolve({ authenticated: false })
        if (method === 'consent_prepare') return Promise.resolve({})
        return Promise.resolve({})
      })
      fakeIframe._fireLoad()
      await mountPromise

      const getPrincipalPromise = sdk.getPrincipal()
      await new Promise((r) => setTimeout(r, 0))

      // randomUUID is called once for the consentId (index 0)
      const consentId = vi.mocked(crypto.randomUUID).mock.results[0]?.value
      sendMessage({ type: 'consent_rejected', consentId })

      await expect(getPrincipalPromise).rejects.toBeInstanceOf(UserRejectedError)
    })
  })

  // ─── on() / off() ────────────────────────────────────────────────────────────

  describe('on() / off()', () => {
    it('on() registers a listener that is called on emit', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      const listener = vi.fn()
      sdk.on('connected', listener)

      await mountSdk(sdk, container, fakeIframe)
      expect(listener).toHaveBeenCalledOnce()
    })

    it('off() removes a listener so it is no longer called', async () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      const listener = vi.fn()
      sdk.on('disconnected', listener)
      sdk.off('disconnected', listener)

      await mountSdk(sdk, container, fakeIframe)
      sdk.unmount()

      expect(listener).not.toHaveBeenCalled()
    })

    it('on() is chainable', () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      expect(sdk.on('connected', vi.fn())).toBe(sdk)
    })

    it('off() is chainable', () => {
      const sdk = new WalletSDK({ walletOrigin: WALLET_ORIGIN })
      expect(sdk.off('connected', vi.fn())).toBe(sdk)
    })
  })
})
