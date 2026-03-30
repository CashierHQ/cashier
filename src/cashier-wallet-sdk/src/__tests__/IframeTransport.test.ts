import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IframeTransport, IframeTransportError } from '../IframeTransport'

// ── Hoisted mock state ────────────────────────────────────────────────────────

const {
  MockHeartbeatClient,
  MockPostMessageChannel,
  mockPostMessageChannel,
  getCapturedOptions,
  resetCaptured,
} = vi.hoisted(() => {
  let capturedOpts: Record<string, unknown> = {}
  const mockPmc = { close: vi.fn().mockResolvedValue(undefined) }
  const MockPmc = vi.fn().mockReturnValue(mockPmc)
  const MockHbc = vi.fn().mockImplementation((opts: Record<string, unknown>) => {
    capturedOpts = opts
  })
  return {
    MockHeartbeatClient: MockHbc,
    MockPostMessageChannel: MockPmc,
    mockPostMessageChannel: mockPmc,
    getCapturedOptions: () => capturedOpts,
    resetCaptured: () => { capturedOpts = {} },
  }
})

vi.mock('@slide-computer/signer-web', () => ({
  HeartbeatClient: MockHeartbeatClient,
  PostMessageChannel: MockPostMessageChannel,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fire the iframe load event and flush the microtask queue to let the
 * async `ensureIframe()` promise chain settle — including the await in
 * `establishChannel()` that calls `new HeartbeatClient(options)`.
 */
async function fireLoad(iframe: { _fireLoad: () => void }) {
  iframe._fireLoad()
  // Use a macro-task delay to guarantee all pending microtasks (including
  // nested promise continuations from the async await chain) have flushed.
  await new Promise<void>((r) => setTimeout(r, 0))
}

/** Create a fake iframe that fires the 'load' event asynchronously. */
function makeFakeIframe() {
  const listeners: Record<string, ((e: Event) => void)[]> = {}
  const fakeContentWindow = {} as Window

  const iframe = {
    src: '',
    style: { cssText: '' },
    title: '',
    allow: '',
    contentWindow: fakeContentWindow,
    addEventListener: vi.fn((event: string, handler: (e: Event) => void) => {
      listeners[event] = listeners[event] ?? []
      listeners[event].push(handler)
    }),
    remove: vi.fn(),
    _fireLoad: () => listeners['load']?.forEach((fn) => fn(new Event('load'))),
  }
  return iframe
}

describe('IframeTransport', () => {
  let fakeIframe: ReturnType<typeof makeFakeIframe>

  beforeEach(() => {
    resetCaptured()
    MockHeartbeatClient.mockClear()
    MockPostMessageChannel.mockClear()

    fakeIframe = makeFakeIframe()
    vi.spyOn(document, 'createElement').mockReturnValue(
      fakeIframe as unknown as HTMLIFrameElement,
    )
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── constructor ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('throws IframeTransportError on invalid URL', () => {
      expect(() => new IframeTransport({ url: 'not-a-url' })).toThrow(IframeTransportError)
      expect(() => new IframeTransport({ url: 'not-a-url' })).toThrow('Invalid wallet URL')
    })

    it('accepts a valid URL without throwing', () => {
      expect(() => new IframeTransport({ url: 'https://wallet.example.com' })).not.toThrow()
    })

    it('applies correct default option values', async () => {
      const transport = new IframeTransport({ url: 'https://wallet.example.com' })

      const channelPromise = transport.establishChannel()
      await fireLoad(fakeIframe)
      getCapturedOptions().onEstablish?.('https://wallet.example.com')
      await channelPromise

      expect(getCapturedOptions().establishTimeout).toBe(30_000)
      expect(getCapturedOptions().disconnectTimeout).toBe(30_000)
      expect(getCapturedOptions().statusPollingRate).toBe(300)
    })

    it('accepts custom timeout options', async () => {
      const transport = new IframeTransport({
        url: 'https://wallet.example.com',
        establishTimeout: 5_000,
        disconnectTimeout: 10_000,
        statusPollingRate: 150,
      })

      const channelPromise = transport.establishChannel()
      await fireLoad(fakeIframe)
      getCapturedOptions().onEstablish?.('https://wallet.example.com')
      await channelPromise

      expect(getCapturedOptions().establishTimeout).toBe(5_000)
      expect(getCapturedOptions().disconnectTimeout).toBe(10_000)
      expect(getCapturedOptions().statusPollingRate).toBe(150)
    })
  })

  // ─── establishChannel() ─────────────────────────────────────────────────────

  describe('establishChannel()', () => {
    it('creates an iframe with correct src, title, allow and hidden styles', async () => {
      const transport = new IframeTransport({ url: 'https://wallet.example.com' })

      const channelPromise = transport.establishChannel()
      await fireLoad(fakeIframe)
      getCapturedOptions().onEstablish?.('https://wallet.example.com')
      await channelPromise

      expect(fakeIframe.src).toBe('https://wallet.example.com')
      expect(fakeIframe.title).toBe('Cashier Wallet bridge')
      expect(fakeIframe.allow).toContain('popups')
      expect(fakeIframe.style.cssText).toContain('position:fixed')
    })

    it('appends the iframe to document.body by default', async () => {
      const transport = new IframeTransport({ url: 'https://wallet.example.com' })

      const channelPromise = transport.establishChannel()
      await fireLoad(fakeIframe)
      getCapturedOptions().onEstablish?.('https://wallet.example.com')
      await channelPromise

      expect(document.body.appendChild).toHaveBeenCalledWith(fakeIframe)
    })

    it('appends the iframe to a custom container if provided', async () => {
      const container = { appendChild: vi.fn() } as unknown as HTMLElement
      const transport = new IframeTransport({ url: 'https://wallet.example.com', container })

      const channelPromise = transport.establishChannel()
      await fireLoad(fakeIframe)
      getCapturedOptions().onEstablish?.('https://wallet.example.com')
      await channelPromise

      expect(container.appendChild).toHaveBeenCalledWith(fakeIframe)
    })

    it('resolves with a PostMessageChannel when onEstablish fires', async () => {
      const transport = new IframeTransport({ url: 'https://wallet.example.com' })

      const channelPromise = transport.establishChannel()
      fakeIframe._fireLoad()
      getCapturedOptions().onEstablish?.('https://wallet.example.com')

      const channel = await channelPromise
      expect(channel).toBe(mockPostMessageChannel)
      expect(MockPostMessageChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          signerWindow: fakeIframe.contentWindow,
          manageFocus: false,
        }),
      )
    })

    it('rejects with IframeTransportError when onEstablishTimeout fires', async () => {
      const transport = new IframeTransport({ url: 'https://wallet.example.com' })

      const channelPromise = transport.establishChannel()
      await fireLoad(fakeIframe)
      getCapturedOptions().onEstablishTimeout?.()

      await expect(channelPromise).rejects.toBeInstanceOf(IframeTransportError)
      await expect(channelPromise).rejects.toThrow('ICRC-29 channel could not be established')
    })

    it('reuses the same iframe on subsequent establishChannel() calls', async () => {
      const transport = new IframeTransport({ url: 'https://wallet.example.com' })

      // First call
      const first = transport.establishChannel()
      await fireLoad(fakeIframe)
      getCapturedOptions().onEstablish?.('https://wallet.example.com')
      await first

      const createElementSpy = vi.spyOn(document, 'createElement')

      // Second call — iframe already mounted, should reuse contentWindow (no load event needed)
      const second = transport.establishChannel()
      await Promise.resolve() // let ensureIframe resolve from existing contentWindow
      getCapturedOptions().onEstablish?.('https://wallet.example.com')
      await second

      expect(createElementSpy).not.toHaveBeenCalled()
    })
  })

  // ─── destroy() ──────────────────────────────────────────────────────────────

  describe('destroy()', () => {
    it('removes the iframe from DOM', async () => {
      const transport = new IframeTransport({ url: 'https://wallet.example.com' })

      const channelPromise = transport.establishChannel()
      await fireLoad(fakeIframe)
      getCapturedOptions().onEstablish?.('https://wallet.example.com')
      await channelPromise

      transport.destroy()
      expect(fakeIframe.remove).toHaveBeenCalledOnce()
    })

    it('is a no-op if called before establishChannel', () => {
      const transport = new IframeTransport({ url: 'https://wallet.example.com' })
      expect(() => transport.destroy()).not.toThrow()
    })

    it('is safe to call twice', async () => {
      const transport = new IframeTransport({ url: 'https://wallet.example.com' })

      const channelPromise = transport.establishChannel()
      await fireLoad(fakeIframe)
      getCapturedOptions().onEstablish?.('https://wallet.example.com')
      await channelPromise

      transport.destroy()
      expect(() => transport.destroy()).not.toThrow()
    })
  })
})
