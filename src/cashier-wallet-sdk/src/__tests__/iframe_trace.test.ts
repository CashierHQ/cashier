import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IframeTransport } from '../IframeTransport'

const {
  MockHeartbeatClient,
  MockPostMessageChannel,
  getCapturedOptions,
  resetCaptured,
} = vi.hoisted(() => {
  let capturedOpts: Record<string, unknown> = {}
  const MockPmc = vi.fn().mockReturnValue({ close: vi.fn().mockResolvedValue(undefined) })
  const MockHbc = vi.fn().mockImplementation((opts: Record<string, unknown>) => {
    capturedOpts = opts
  })
  return {
    MockHeartbeatClient: MockHbc,
    MockPostMessageChannel: MockPmc,
    getCapturedOptions: () => capturedOpts,
    resetCaptured: () => { capturedOpts = {} },
  }
})

vi.mock('@slide-computer/signer-web', () => ({
  HeartbeatClient: MockHeartbeatClient,
  PostMessageChannel: MockPostMessageChannel,
}))

function makeFakeIframe() {
  const listeners: Record<string, ((e: Event) => void)[]> = {}
  const iframe = {
    src: '', style: { cssText: '' }, title: '', allow: '',
    contentWindow: {} as Window,
    addEventListener: vi.fn((event: string, handler: (e: Event) => void) => {
      console.log(`[fakeIframe.addEventListener] event="${event}"`)
      listeners[event] = listeners[event] ?? []
      listeners[event].push(handler)
    }),
    remove: vi.fn(),
    _fireLoad: () => {
      console.log('[fakeIframe._fireLoad] called, listener count:', listeners['load']?.length ?? 0)
      listeners['load']?.forEach((fn) => fn(new Event('load')))
    },
  }
  return iframe
}

describe('trace', () => {
  let fakeIframe: ReturnType<typeof makeFakeIframe>

  beforeEach(() => {
    console.log('[beforeEach] start')
    resetCaptured()
    MockHeartbeatClient.mockClear()
    MockPostMessageChannel.mockClear()
    fakeIframe = makeFakeIframe()
    vi.spyOn(document, 'createElement').mockReturnValue(fakeIframe as unknown as HTMLIFrameElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    console.log('[beforeEach] done')
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('test A (no-op)', () => {
    console.log('[test A] running')
    expect(true).toBe(true)
  })

  it('test B (fireLoad)', async () => {
    const transport = new IframeTransport({ url: 'https://wallet.example.com' })
    const channelPromise = transport.establishChannel()

    fakeIframe._fireLoad()
    await Promise.resolve()
    await Promise.resolve()

    getCapturedOptions().onEstablish?.('https://wallet.example.com')
    await channelPromise
    expect(getCapturedOptions().establishTimeout).toBe(30_000)
  })
})
