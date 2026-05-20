import { describe, it, expect, vi, beforeEach } from 'vitest'

// BroadcastChannel in jsdom does NOT deliver a message back to the same
// instance that sent it. Tests must use separate sender/receiver channels.

describe('icrc25-permission-store', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('createPendingPermission stores an entry with correct data', async () => {
    const { createPendingPermission, pendingPermissions } = await import(
      '../icrc25-permission-store'
    )

    const confirmMock = vi.fn()
    const requestId = 'test-id-1'
    const scopes = [{ scope: { method: 'icrc27_accounts' as const }, state: 'granted' as const }]

    createPendingPermission(requestId, scopes, 'https://dapp.example', confirmMock)

    expect(pendingPermissions.has(requestId)).toBe(true)
    expect(pendingPermissions.get(requestId)?.origin).toBe('https://dapp.example')
    expect(pendingPermissions.get(requestId)?.requestedScopes).toEqual(scopes)
  })

  it('icrc25_get causes the store to broadcast icrc25_data', async () => {
    const { createPendingPermission } = await import('../icrc25-permission-store')

    const requestId = 'test-id-get'
    const scopes = [{ scope: { method: 'icrc27_accounts' as const }, state: 'granted' as const }]
    createPendingPermission(requestId, scopes, 'https://dapp.example', vi.fn())

    // Separate receiver to catch the store's icrc25_data response
    const received: unknown[] = []
    const receiverChannel = new BroadcastChannel('wallet-icrc25-permissions')
    receiverChannel.addEventListener('message', (e: MessageEvent) => received.push(e.data))

    // Separate sender so the store's onmessage fires (sender ≠ store's channel)
    const senderChannel = new BroadcastChannel('wallet-icrc25-permissions')
    senderChannel.postMessage({ type: 'icrc25_get', requestId })

    await new Promise((r) => setTimeout(r, 50))

    const response = received.find(
      (d: unknown) => (d as { type?: string }).type === 'icrc25_data',
    ) as { type: string; requestId: string; origin: string; requestedScopes: unknown[] } | undefined
    expect(response?.type).toBe('icrc25_data')
    expect(response?.requestId).toBe(requestId)
    expect(response?.origin).toBe('https://dapp.example')
    expect(response?.requestedScopes).toEqual(scopes)

    senderChannel.close()
    receiverChannel.close()
  })

  it('icrc25_confirmed calls oisyConfirm with chosen scopes and removes entry', async () => {
    const { createPendingPermission, pendingPermissions } = await import(
      '../icrc25-permission-store'
    )

    const confirmMock = vi.fn()
    const requestId = 'test-id-confirm'
    const scopes = [
      { scope: { method: 'icrc27_accounts' as const }, state: 'granted' as const },
      { scope: { method: 'icrc49_call_canister' as const }, state: 'granted' as const },
    ]
    createPendingPermission(requestId, scopes, 'https://dapp.example', confirmMock)

    const chosenScopes = [
      { scope: { method: 'icrc27_accounts' as const }, state: 'granted' as const },
      { scope: { method: 'icrc49_call_canister' as const }, state: 'denied' as const },
    ]

    // Send from a separate channel so the store's onmessage fires
    const senderChannel = new BroadcastChannel('wallet-icrc25-permissions')
    senderChannel.postMessage({ type: 'icrc25_confirmed', requestId, scopes: chosenScopes })

    await new Promise((r) => setTimeout(r, 50))

    expect(confirmMock).toHaveBeenCalledWith(chosenScopes)
    expect(pendingPermissions.has(requestId)).toBe(false)

    senderChannel.close()
  })

  it('TTL expiry calls oisyConfirm with all-denied scopes', async () => {
    vi.useFakeTimers()

    const { createPendingPermission, pendingPermissions } = await import(
      '../icrc25-permission-store'
    )

    const confirmMock = vi.fn()
    const requestId = 'test-id-ttl'
    const scopes = [
      { scope: { method: 'icrc27_accounts' as const }, state: 'granted' as const },
      { scope: { method: 'icrc49_call_canister' as const }, state: 'granted' as const },
    ]
    createPendingPermission(requestId, scopes, 'https://dapp.example', confirmMock)

    vi.advanceTimersByTime(5 * 60 * 1_000 + 100)

    expect(confirmMock).toHaveBeenCalledWith([
      { scope: { method: 'icrc27_accounts' }, state: 'denied' },
      { scope: { method: 'icrc49_call_canister' }, state: 'denied' },
    ])
    expect(pendingPermissions.has(requestId)).toBe(false)

    vi.useRealTimers()
  })

  it('multiple concurrent requests are tracked independently', async () => {
    const { createPendingPermission, pendingPermissions } = await import(
      '../icrc25-permission-store'
    )

    createPendingPermission('req-a', [], 'https://dapp-a.example', vi.fn())
    createPendingPermission('req-b', [], 'https://dapp-b.example', vi.fn())

    expect(pendingPermissions.size).toBe(2)
    expect(pendingPermissions.get('req-a')?.origin).toBe('https://dapp-a.example')
    expect(pendingPermissions.get('req-b')?.origin).toBe('https://dapp-b.example')
  })
})
