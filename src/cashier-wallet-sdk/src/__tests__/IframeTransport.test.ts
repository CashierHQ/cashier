import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IframeTransport, IframeTransportError } from '../IframeTransport'

// ── Hoisted mock state ────────────────────────────────────────────────────────
//
// We can't rely on a closure variable inside `vi.hoisted` to capture the
// HeartbeatClient options: with vitest 3 + jsdom, the closure that the mock
// implementation writes to and the closure that test code reads from can be
// different instances. Instead, we read `MockHeartbeatClient.mock.calls[0][0]`
// directly via `getCapturedOptions()`, which always returns the latest args
// from the same mock instance the source code invokes.

const { MockHeartbeatClient, MockPostMessageChannel, mockPostMessageChannel } =
  vi.hoisted(() => {
    const mockPmc = { close: vi.fn().mockResolvedValue(undefined) }
    // `mockReturnValue` / `mockImplementation` are not always honoured when
    // a vi.fn() is invoked with `new` — `new` discards primitive returns and
    // sometimes keeps the fresh spy `this`. Passing the implementation
    // directly to `vi.fn(fn)` ensures the returned object always replaces
    // the constructor's `this`, so the test can do `expect(channel).toBe(...)`.
    const MockPmc = vi.fn(() => mockPmc)
    const MockHbc = vi.fn()
    return {
      MockHeartbeatClient: MockHbc,
      MockPostMessageChannel: MockPmc,
      mockPostMessageChannel: mockPmc,
    }
  })

vi.mock('@slide-computer/signer-web', () => ({
  HeartbeatClient: MockHeartbeatClient,
  PostMessageChannel: MockPostMessageChannel,
}))

interface HeartbeatClientOptions {
  signerWindow: Window
  establishTimeout: number
  disconnectTimeout: number
  statusPollingRate: number
  onEstablish?: (origin: string) => void
  onEstablishTimeout?: () => void
  onDisconnect?: () => void
  manageFocus?: boolean
}

function getCapturedOptions(): Partial<HeartbeatClientOptions> {
  const lastCall = MockHeartbeatClient.mock.calls.at(-1)
  return (lastCall?.[0] ?? {}) as Partial<HeartbeatClientOptions>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fire the iframe load event and flush the microtask queue to let the
 * async `ensureIframe()` promise chain settle — including the await in
 * `establishChannel()` that calls `new HeartbeatClient(options)`.
 *
 * We rely purely on awaited microtasks here. Vitest 3 + jsdom can be
 * unreliable about whether `setTimeout(0)` actually fires before the
 * test continues; awaiting `Promise.resolve()` directly drains the
 * microtask queue synchronously and predictably.
 */
async function fireLoad(iframe: { _fireLoad: () => void }) {
  iframe._fireLoad()
  await Promise.resolve()
  await Promise.resolve()
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
      await fireLoad(fakeIframe)
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
