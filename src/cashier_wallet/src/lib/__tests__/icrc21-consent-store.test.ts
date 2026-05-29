import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { icrc21_consent_info } from '../icrc21-types'

const mockConsentInfo: icrc21_consent_info = {
  metadata: { language: 'en', utc_offset_minutes: [] },
  consent_message: { GenericDisplayMessage: 'Transfer 1 ICP to abc123' },
}

describe('icrc21-consent-store', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('createPendingConsent21 stores an entry in loading state', async () => {
    const { createPendingConsent21, pendingConsents21 } = await import('../icrc21-consent-store')

    createPendingConsent21('req-loading', 'https://dapp.example')

    const entry = pendingConsents21.get('req-loading')
    expect(entry).toBeDefined()
    expect(entry?.status).toBe('loading')
    expect(entry?.origin).toBe('https://dapp.example')
  })

  it('updateConsent21Result updates entry status and broadcasts status update', async () => {
    const { createPendingConsent21, updateConsent21Result, pendingConsents21 } = await import(
      '../icrc21-consent-store'
    )

    createPendingConsent21('req-result', 'https://dapp.example')

    const approveMock = vi.fn()
    const rejectMock = vi.fn()

    const received: unknown[] = []
    const receiverChannel = new BroadcastChannel('wallet-icrc21-consent')
    receiverChannel.addEventListener('message', (e: MessageEvent) => received.push(e.data))

    updateConsent21Result('req-result', mockConsentInfo, approveMock, rejectMock)

    const entry = pendingConsents21.get('req-result')
    expect(entry?.status).toBe('result')
    expect(entry?.consentInfo).toEqual(mockConsentInfo)
    expect(entry?.oisyApprove).toBe(approveMock)
    expect(entry?.oisyReject).toBe(rejectMock)

    await new Promise((r) => setTimeout(r, 50))

    const update = received.find(
      (d: unknown) => (d as { type?: string }).type === 'icrc21_status_update',
    ) as { status: string; consentInfo: unknown } | undefined
    expect(update?.status).toBe('result')
    expect(update?.consentInfo).toEqual(mockConsentInfo)

    receiverChannel.close()
  })

  it('icrc21_approved calls oisyApprove and removes entry', async () => {
    const { createPendingConsent21, updateConsent21Result, pendingConsents21 } = await import(
      '../icrc21-consent-store'
    )

    createPendingConsent21('req-approve', 'https://dapp.example')

    const approveMock = vi.fn()
    const rejectMock = vi.fn()
    updateConsent21Result('req-approve', mockConsentInfo, approveMock, rejectMock)

    // Send from a separate channel so the store's onmessage fires
    const senderChannel = new BroadcastChannel('wallet-icrc21-consent')
    senderChannel.postMessage({ type: 'icrc21_approved', requestId: 'req-approve' })

    await new Promise((r) => setTimeout(r, 50))

    expect(approveMock).toHaveBeenCalledOnce()
    expect(rejectMock).not.toHaveBeenCalled()
    expect(pendingConsents21.has('req-approve')).toBe(false)

    senderChannel.close()
  })

  it('icrc21_rejected calls oisyReject and removes entry', async () => {
    const { createPendingConsent21, updateConsent21Result, pendingConsents21 } = await import(
      '../icrc21-consent-store'
    )

    createPendingConsent21('req-reject', 'https://dapp.example')

    const approveMock = vi.fn()
    const rejectMock = vi.fn()
    updateConsent21Result('req-reject', mockConsentInfo, approveMock, rejectMock)

    // Send from a separate channel so the store's onmessage fires
    const senderChannel = new BroadcastChannel('wallet-icrc21-consent')
    senderChannel.postMessage({ type: 'icrc21_rejected', requestId: 'req-reject' })

    await new Promise((r) => setTimeout(r, 50))

    expect(rejectMock).toHaveBeenCalledOnce()
    expect(approveMock).not.toHaveBeenCalled()
    expect(pendingConsents21.has('req-reject')).toBe(false)

    senderChannel.close()
  })

  it('updateConsent21Error broadcasts error state and removes entry', async () => {
    const { createPendingConsent21, updateConsent21Error, pendingConsents21 } = await import(
      '../icrc21-consent-store'
    )

    createPendingConsent21('req-error', 'https://dapp.example')

    const received: unknown[] = []
    const receiverChannel = new BroadcastChannel('wallet-icrc21-consent')
    receiverChannel.addEventListener('message', (e: MessageEvent) => received.push(e.data))

    updateConsent21Error('req-error', { message: 'Canister does not implement ICRC-21' })

    await new Promise((r) => setTimeout(r, 50))

    const update = received.find(
      (d: unknown) => (d as { type?: string }).type === 'icrc21_status_update',
    ) as { status: string } | undefined
    expect(update?.status).toBe('error')
    // Entry cleaned up immediately on error
    expect(pendingConsents21.has('req-error')).toBe(false)

    receiverChannel.close()
  })

  it('TTL expiry calls oisyReject', async () => {
    vi.useFakeTimers()

    const { createPendingConsent21, updateConsent21Result, pendingConsents21 } = await import(
      '../icrc21-consent-store'
    )

    createPendingConsent21('req-ttl', 'https://dapp.example')

    const approveMock = vi.fn()
    const rejectMock = vi.fn()
    updateConsent21Result('req-ttl', mockConsentInfo, approveMock, rejectMock)

    vi.advanceTimersByTime(5 * 60 * 1_000 + 100)

    expect(rejectMock).toHaveBeenCalledOnce()
    expect(pendingConsents21.has('req-ttl')).toBe(false)

    vi.useRealTimers()
  })

  it('icrc21_get broadcasts current entry state', async () => {
    const { createPendingConsent21, updateConsent21Result } = await import(
      '../icrc21-consent-store'
    )

    createPendingConsent21('req-get', 'https://dapp.example')
    updateConsent21Result('req-get', mockConsentInfo, vi.fn(), vi.fn())

    const received: unknown[] = []
    const receiverChannel = new BroadcastChannel('wallet-icrc21-consent')
    receiverChannel.addEventListener('message', (e: MessageEvent) => received.push(e.data))

    // Send icrc21_get from a separate channel
    const senderChannel = new BroadcastChannel('wallet-icrc21-consent')
    senderChannel.postMessage({ type: 'icrc21_get', requestId: 'req-get' })

    await new Promise((r) => setTimeout(r, 50))

    const data = received.find(
      (d: unknown) => (d as { type?: string }).type === 'icrc21_data',
    ) as { status: string; consentInfo: unknown } | undefined
    expect(data?.status).toBe('result')
    expect(data?.consentInfo).toEqual(mockConsentInfo)

    senderChannel.close()
    receiverChannel.close()
  })
})
