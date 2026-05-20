import { describe, it, expect, vi, beforeEach } from 'vitest'

// BroadcastChannel in jsdom does NOT deliver a message back to the same
// instance that sent it. Tests must use separate sender/receiver channels.

describe('consent-store', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('createPendingConsent stores an entry with correct data', async () => {
    const { createPendingConsent, pendingConsents } = await import('../consent-store')

    createPendingConsent('id-1', 'sign_message', { message: 'hello' }, 'https://dapp.example')

    const entry = pendingConsents.get('id-1')
    expect(entry).toBeDefined()
    expect(entry?.method).toBe('sign_message')
    expect(entry?.params).toEqual({ message: 'hello' })
    expect(entry?.dappOrigin).toBe('https://dapp.example')
    expect(entry?.approvalPromise).toBeInstanceOf(Promise)
  })

  it('consent_get broadcasts consent_data with full entry details', async () => {
    const { createPendingConsent } = await import('../consent-store')

    createPendingConsent('id-get', 'icrc1_transfer', { amount: '100' }, 'https://dapp.example')

    const received: unknown[] = []
    const receiverChannel = new BroadcastChannel('wallet-consent')
    receiverChannel.addEventListener('message', (e: MessageEvent) => received.push(e.data))

    const senderChannel = new BroadcastChannel('wallet-consent')
    senderChannel.postMessage({ type: 'consent_get', consentId: 'id-get' })

    await new Promise((r) => setTimeout(r, 50))

    const data = received.find(
      (d) => (d as { type?: string }).type === 'consent_data',
    ) as { method: string; params: unknown; dappOrigin: string; consentId: string } | undefined
    expect(data?.method).toBe('icrc1_transfer')
    expect(data?.params).toEqual({ amount: '100' })
    expect(data?.dappOrigin).toBe('https://dapp.example')
    expect(data?.consentId).toBe('id-get')

    senderChannel.close()
    receiverChannel.close()
  })

  it('consent_get for unknown consentId broadcasts nothing', async () => {
    const { createPendingConsent } = await import('../consent-store')
    createPendingConsent('id-known', 'ping', {}, 'https://dapp.example')

    const received: unknown[] = []
    const receiverChannel = new BroadcastChannel('wallet-consent')
    receiverChannel.addEventListener('message', (e: MessageEvent) => received.push(e.data))

    const senderChannel = new BroadcastChannel('wallet-consent')
    senderChannel.postMessage({ type: 'consent_get', consentId: 'id-unknown' })

    await new Promise((r) => setTimeout(r, 50))

    expect(received.filter((d) => (d as { type?: string }).type === 'consent_data')).toHaveLength(0)

    senderChannel.close()
    receiverChannel.close()
  })

  it('consent_approved resolves the approvalPromise', async () => {
    const { createPendingConsent, pendingConsents } = await import('../consent-store')

    createPendingConsent('id-approve', 'get_principal', {}, 'https://dapp.example')
    const entry = pendingConsents.get('id-approve')!

    const resolved = vi.fn()
    entry.approvalPromise.then(resolved)

    const senderChannel = new BroadcastChannel('wallet-consent')
    senderChannel.postMessage({ type: 'consent_approved', consentId: 'id-approve' })

    await new Promise((r) => setTimeout(r, 50))

    expect(resolved).toHaveBeenCalledOnce()
    senderChannel.close()
  })

  it('consent_rejected rejects the approvalPromise with an Error', async () => {
    const { createPendingConsent, pendingConsents } = await import('../consent-store')

    createPendingConsent('id-reject', 'get_principal', {}, 'https://dapp.example')
    const entry = pendingConsents.get('id-reject')!

    const rejected = vi.fn()
    entry.approvalPromise.catch(rejected)

    const senderChannel = new BroadcastChannel('wallet-consent')
    senderChannel.postMessage({ type: 'consent_rejected', consentId: 'id-reject' })

    await new Promise((r) => setTimeout(r, 50))

    expect(rejected).toHaveBeenCalledOnce()
    expect(rejected.mock.calls[0][0]).toBeInstanceOf(Error)
    senderChannel.close()
  })

  it('TTL expiry rejects the approvalPromise and removes the entry', async () => {
    vi.useFakeTimers()

    const { createPendingConsent, pendingConsents } = await import('../consent-store')

    createPendingConsent('id-ttl', 'icrc1_balance_of', {}, 'https://dapp.example')
    const entry = pendingConsents.get('id-ttl')!

    const rejected = vi.fn()
    entry.approvalPromise.catch(rejected)

    vi.advanceTimersByTime(5 * 60 * 1_000 + 100)

    // Allow microtask queue to drain
    await Promise.resolve()

    expect(rejected).toHaveBeenCalledOnce()
    expect(pendingConsents.has('id-ttl')).toBe(false)

    vi.useRealTimers()
  })

  it('messages without type or consentId are ignored', async () => {
    const { createPendingConsent, pendingConsents } = await import('../consent-store')

    createPendingConsent('id-noise', 'ping', {}, 'https://dapp.example')

    const senderChannel = new BroadcastChannel('wallet-consent')
    senderChannel.postMessage({ consentId: 'id-noise' }) // no type
    senderChannel.postMessage({ type: 'consent_approved' }) // no consentId
    senderChannel.postMessage({}) // neither

    await new Promise((r) => setTimeout(r, 50))

    // Entry still present (no spurious approval/rejection)
    expect(pendingConsents.has('id-noise')).toBe(true)
    senderChannel.close()
  })
})
