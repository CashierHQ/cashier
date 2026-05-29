import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRefreshAuthClient = vi.fn().mockResolvedValue(undefined)
const mockIsAuthenticated = vi.fn().mockResolvedValue(true)
const mockLogin = vi.fn()
const mockLogout = vi.fn()
const mockGetIdentity = vi.fn()

vi.mock('../identity-manager', () => ({
  refreshAuthClient: mockRefreshAuthClient,
  isAuthenticated: mockIsAuthenticated,
  login: mockLogin,
  logout: mockLogout,
  getIdentity: mockGetIdentity,
}))

const mockSignMessage = vi.fn()
vi.mock('../signer', () => ({
  signMessage: mockSignMessage,
}))

const mockCreatePendingConsent = vi.fn()
const mockPendingConsents = new Map<string, {
  approvalPromise: Promise<void>
  _approve: () => void
  _reject: (r: string) => void
  method: string
  params: unknown
  dappOrigin: string
}>()

vi.mock('../consent-store', () => ({
  createPendingConsent: mockCreatePendingConsent,
  pendingConsents: mockPendingConsents,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSource() {
  return { postMessage: vi.fn() }
}

function sendRequest(
  method: string,
  params: unknown,
  source: ReturnType<typeof makeSource>,
  origin = 'https://dapp.example',
  id = 'req-1',
) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { jsonrpc: '2.0', id, method, params },
      origin,
      source: source as unknown as MessageEventSource,
    }),
  )
}

/** Wait a tick to let async handlers settle. */
const tick = () => new Promise((r) => setTimeout(r, 50))

/** Add a consent entry backed by a pre-resolved promise. */
function addConsentApproved(consentId: string) {
  mockPendingConsents.set(consentId, {
    approvalPromise: Promise.resolve(),
    _approve: vi.fn(),
    _reject: vi.fn(),
    method: 'test',
    params: {},
    dappOrigin: 'https://dapp.example',
  })
}

/** Add a consent entry backed by a pre-rejected promise. */
function addConsentRejected(consentId: string) {
  // Attach a no-op catch so vitest doesn't flag the synchronous rejection
  // as unhandled before production code's try/catch runs.
  const approvalPromise = Promise.reject(new Error('User rejected the request'))
  approvalPromise.catch(() => {})
  mockPendingConsents.set(consentId, {
    approvalPromise,
    _approve: vi.fn(),
    _reject: vi.fn(),
    method: 'test',
    params: {},
    dappOrigin: 'https://dapp.example',
  })
}

describe('rpc-handler', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mockPendingConsents.clear()
    mockRefreshAuthClient.mockResolvedValue(undefined)
    mockIsAuthenticated.mockResolvedValue(true)
  })

  // ─── Origin / shape validation ───────────────────────────────────────────────

  describe('message validation', () => {
    it('ignores messages with no origin', async () => {
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { jsonrpc: '2.0', id: '1', method: 'ping' },
          origin: '',
          source: source as unknown as MessageEventSource,
        }),
      )
      await tick()

      expect(source.postMessage).not.toHaveBeenCalled()
    })

    it('ignores messages where origin is the string "null"', async () => {
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { jsonrpc: '2.0', id: '1', method: 'ping' },
          origin: 'null',
          source: source as unknown as MessageEventSource,
        }),
      )
      await tick()

      expect(source.postMessage).not.toHaveBeenCalled()
    })

    it('ignores messages without jsonrpc: "2.0"', async () => {
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { id: '1', method: 'ping' },
          origin: 'https://dapp.example',
          source: source as unknown as MessageEventSource,
        }),
      )
      await tick()

      expect(source.postMessage).not.toHaveBeenCalled()
    })

    it('calls the onRequest callback with the method name', async () => {
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      const onRequest = vi.fn()
      initRpcHandler(onRequest)

      sendRequest('ping', undefined, source)
      await tick()

      expect(onRequest).toHaveBeenCalledWith('ping')
    })
  })

  // ─── ping ────────────────────────────────────────────────────────────────────

  describe('ping', () => {
    it('responds with result "pong"', async () => {
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('ping', undefined, source)
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        { jsonrpc: '2.0', id: 'req-1', result: 'pong' },
        { targetOrigin: 'https://dapp.example' },
      )
    })
  })

  // ─── connect ────────────────────────────────────────────────────────────────

  describe('connect', () => {
    it('responds with status, walletOrigin, and version', async () => {
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('connect', undefined, source)
      await tick()

      const response = source.postMessage.mock.calls[0]?.[0]
      expect(response.result).toMatchObject({
        status: 'connected',
        version: '0.1.0',
      })
    })
  })

  // ─── is_authenticated ────────────────────────────────────────────────────────

  describe('is_authenticated', () => {
    it('responds with { authenticated: true } when session is active', async () => {
      mockIsAuthenticated.mockResolvedValue(true)
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('is_authenticated', undefined, source)
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ result: { authenticated: true } }),
        expect.anything(),
      )
    })

    it('responds with { authenticated: false } when no session', async () => {
      mockIsAuthenticated.mockResolvedValue(false)
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('is_authenticated', undefined, source)
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ result: { authenticated: false } }),
        expect.anything(),
      )
    })
  })

  // ─── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('responds with principal on successful login', async () => {
      mockLogin.mockResolvedValue({ ok: true })
      mockGetIdentity.mockReturnValue({ getPrincipal: () => ({ toText: () => 'user-principal' }) })

      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('login', undefined, source)
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ result: { principal: 'user-principal' } }),
        expect.anything(),
      )
    })

    it('responds with error code 4001 when login fails', async () => {
      mockLogin.mockResolvedValue({ ok: false, error: 'user cancelled' })

      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('login', undefined, source)
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 4001 }) }),
        expect.anything(),
      )
    })
  })

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('calls logout() and responds with { status: "logged_out" }', async () => {
      mockLogout.mockResolvedValue(undefined)

      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('logout', undefined, source)
      await tick()

      expect(mockLogout).toHaveBeenCalledOnce()
      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ result: { status: 'logged_out' } }),
        expect.anything(),
      )
    })
  })

  // ─── get_principal_internal ──────────────────────────────────────────────────

  describe('get_principal_internal', () => {
    it('returns the principal without consent when authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(true)
      mockGetIdentity.mockReturnValue({ getPrincipal: () => ({ toText: () => 'my-principal' }) })

      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('get_principal_internal', undefined, source)
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ result: { principal: 'my-principal' } }),
        expect.anything(),
      )
    })

    it('responds with error 4001 when not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false)

      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('get_principal_internal', undefined, source)
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 4001 }) }),
        expect.anything(),
      )
    })
  })

  // ─── consent_prepare ────────────────────────────────────────────────────────

  describe('consent_prepare', () => {
    it('calls createPendingConsent and responds { ok: true }', async () => {
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('consent_prepare', { method: 'get_principal', consentId: 'c-1', params: {} }, source)
      await tick()

      expect(mockCreatePendingConsent).toHaveBeenCalledWith('c-1', 'get_principal', {}, 'https://dapp.example')
      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ result: { ok: true } }),
        expect.anything(),
      )
    })

    it('responds with error -32602 when method or consentId is missing', async () => {
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('consent_prepare', { consentId: 'c-1' }, source) // missing method
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: -32602 }) }),
        expect.anything(),
      )
    })
  })

  // ─── unknown method ──────────────────────────────────────────────────────────

  describe('unknown method', () => {
    it('responds with JSON-RPC error -32601', async () => {
      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('some_made_up_method', {}, source)
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: -32601 }) }),
        expect.anything(),
      )
    })
  })

  // ─── sign_message (consent-gated) ────────────────────────────────────────────

  describe('sign_message', () => {
    it('executes and responds after consent is approved', async () => {
      mockIsAuthenticated.mockResolvedValue(true)
      mockSignMessage.mockResolvedValue({ signature: 'deadbeef', principal: 'signer' })
      addConsentApproved('c-sign')

      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('sign_message', { message: 'hello', consentId: 'c-sign' }, source)
      await tick()

      expect(mockSignMessage).toHaveBeenCalledWith('hello')
      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ result: { signature: 'deadbeef', principal: 'signer' } }),
        expect.anything(),
      )
    })

    it('responds with error 4001 when consent is rejected', async () => {
      mockIsAuthenticated.mockResolvedValue(true)
      addConsentRejected('c-sign-rej')

      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('sign_message', { message: 'hello', consentId: 'c-sign-rej' }, source)
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 4001 }) }),
        expect.anything(),
      )
      expect(mockSignMessage).not.toHaveBeenCalled()
    })

    it('responds with error 4001 when not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false)

      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('sign_message', { message: 'hello', consentId: 'c-1' }, source)
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 4001 }) }),
        expect.anything(),
      )
    })

    it('responds with error -32602 when message param is missing', async () => {
      mockIsAuthenticated.mockResolvedValue(true)

      const { initRpcHandler } = await import('../rpc-handler')
      const source = makeSource()
      initRpcHandler()

      sendRequest('sign_message', { consentId: 'c-1' }, source) // no message
      await tick()

      expect(source.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: -32602 }) }),
        expect.anything(),
      )
    })
  })
})
