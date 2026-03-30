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
    console.log('[test B] start')
    const transport = new IframeTransport({ url: 'https://wallet.example.com' })
    console.log('[test B] created transport')
    const channelPromise = transport.establishChannel()
    console.log('[test B] called establishChannel, about to fireLoad')
    
    // Manual equivalent of fireLoad:
    fakeIframe._fireLoad()
    console.log('[test B] after _fireLoad, about to setTimeout')
    
    await new Promise<void>((r) => {
      console.log('[test B] inside setTimeout executor, calling setTimeout')
      const id = setTimeout(() => {
        console.log('[test B] setTimeout callback fired!')
        r()
      }, 0)
      console.log('[test B] setTimeout registered, id=', id)
    })
    
    console.log('[test B] after await setTimeout - getCapturedOptions:', Object.keys(getCapturedOptions()))
    getCapturedOptions().onEstablish?.('https://wallet.example.com')
    await channelPromise
    expect(getCapturedOptions().establishTimeout).toBe(30_000)
  }, 10000)
})
