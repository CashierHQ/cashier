import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RpcClient } from '../RpcClient'
import { WalletError } from '../errors'

const TARGET_ORIGIN = 'https://wallet.example.com'

/** Simulate a wallet response arriving via postMessage. */
function sendWalletResponse(data: unknown, origin = TARGET_ORIGIN) {
  window.dispatchEvent(new MessageEvent('message', { data, origin }))
}

describe('RpcClient', () => {
  let client: RpcClient
  let uuidCounter = 0

  beforeEach(() => {
    uuidCounter = 0
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      () => `test-uuid-${++uuidCounter}` as `${string}-${string}-${string}-${string}-${string}`,
    )
    client = new RpcClient(TARGET_ORIGIN)
  })

  afterEach(() => {
    client.destroy()
    vi.restoreAllMocks()
  })

  // ─── connect ────────────────────────────────────────────────────────────────

  describe('connect()', () => {
    it('sets target so request() can send messages', async () => {
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      const requestPromise = client.request('ping', undefined, 100)

      sendWalletResponse({ jsonrpc: '2.0', id: 'test-uuid-1', result: 'pong' })

      await requestPromise
      expect(fakeWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ jsonrpc: '2.0', method: 'ping' }),
        expect.objectContaining({ targetOrigin: TARGET_ORIGIN }),
      )
    })
  })

  // ─── request() ──────────────────────────────────────────────────────────────

  describe('request()', () => {
    it('throws when no target is connected', async () => {
      await expect(client.request('ping')).rejects.toThrow('no target connected')
    })

    it('sends a valid JSON-RPC 2.0 message with correct fields', async () => {
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      const requestPromise = client.request('my_method', { foo: 'bar' }, 100)
      sendWalletResponse({ jsonrpc: '2.0', id: 'test-uuid-1', result: 'ok' })
      await requestPromise

      expect(fakeWindow.postMessage).toHaveBeenCalledWith(
        { jsonrpc: '2.0', id: 'test-uuid-1', method: 'my_method', params: { foo: 'bar' } },
        { targetOrigin: TARGET_ORIGIN },
      )
    })

    it('resolves with the result on a successful response', async () => {
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      const requestPromise = client.request('ping')
      sendWalletResponse({ jsonrpc: '2.0', id: 'test-uuid-1', result: 'pong' })

      await expect(requestPromise).resolves.toBe('pong')
    })

    it('rejects with WalletError when the response contains an error', async () => {
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      const requestPromise = client.request('ping')
      sendWalletResponse({
        jsonrpc: '2.0',
        id: 'test-uuid-1',
        error: { code: 4001, message: 'User rejected' },
      })

      await expect(requestPromise).rejects.toBeInstanceOf(WalletError)
      await expect(requestPromise).rejects.toMatchObject({ code: 4001, message: 'User rejected' })
    })

    it('rejects with a timeout error after timeoutMs', async () => {
      vi.useFakeTimers()
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      const requestPromise = client.request('slow_method', undefined, 500)

      vi.advanceTimersByTime(600)

      await expect(requestPromise).rejects.toThrow('RPC timeout: slow_method (500ms)')
      vi.useRealTimers()
    })

    it('does not reject again after timeout if a late response arrives', async () => {
      vi.useFakeTimers()
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      const requestPromise = client.request('slow_method', undefined, 100)
      vi.advanceTimersByTime(200)

      // Late response — should be silently ignored
      sendWalletResponse({ jsonrpc: '2.0', id: 'test-uuid-1', result: 'late' })

      await expect(requestPromise).rejects.toThrow('RPC timeout')
      vi.useRealTimers()
    })
  })

  // ─── handleResponse (origin / shape validation) ──────────────────────────────

  describe('handleResponse()', () => {
    it('ignores messages from the wrong origin', async () => {
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      const requestPromise = client.request('ping', undefined, 100)

      // Send from a different origin — should not resolve
      sendWalletResponse({ jsonrpc: '2.0', id: 'test-uuid-1', result: 'pong' }, 'https://evil.com')

      // The real response never comes — let it timeout
      await expect(requestPromise).rejects.toThrow('RPC timeout')
    })

    it('ignores messages without jsonrpc: "2.0"', async () => {
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      const requestPromise = client.request('ping', undefined, 100)
      sendWalletResponse({ id: 'test-uuid-1', result: 'pong' }) // missing jsonrpc field

      await expect(requestPromise).rejects.toThrow('RPC timeout')
    })

    it('ignores messages with an unknown id', async () => {
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      const requestPromise = client.request('ping', undefined, 100)
      sendWalletResponse({ jsonrpc: '2.0', id: 'unknown-id', result: 'pong' })

      await expect(requestPromise).rejects.toThrow('RPC timeout')
    })
  })

  // ─── destroy() ──────────────────────────────────────────────────────────────

  describe('destroy()', () => {
    it('rejects all pending requests with "RpcClient destroyed"', async () => {
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      const p1 = client.request('method_a', undefined, 30_000)
      const p2 = client.request('method_b', undefined, 30_000)

      client.destroy()

      await expect(p1).rejects.toThrow('RpcClient destroyed')
      await expect(p2).rejects.toThrow('RpcClient destroyed')
    })

    it('stops handling messages after destroy', async () => {
      const fakeWindow = { postMessage: vi.fn() } as unknown as Window
      client.connect(fakeWindow)

      // Create a request and immediately destroy
      const requestPromise = client.request('ping', undefined, 30_000)
      client.destroy()

      // Late wallet response — should not resolve the already-rejected promise
      sendWalletResponse({ jsonrpc: '2.0', id: 'test-uuid-1', result: 'pong' })

      await expect(requestPromise).rejects.toThrow('RpcClient destroyed')
    })
  })
})
