import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GateSDK } from '../GateSDK'
import {
  UserCancelledError,
  ConnectionTimeoutError,
  AuthFailedError,
  PopupBlockedError,
} from '../errors'
import type { XProfile } from '../types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const GATE_ORIGIN = 'https://gate.example.com'

function fixture_of_gate_sdk(config?: Partial<{ gateOrigin: string; timeoutMs: number; popupCheckIntervalMs: number }>) {
  return new GateSDK({
    gateOrigin: GATE_ORIGIN,
    popupCheckIntervalMs: 50,
    ...config,
  })
}

function fixture_of_x_profile(): XProfile {
  return {
    id: 'user123',
    username: 'testuser',
    name: 'Test User',
    profile_image_url: 'https://pbs.twimg.com/profile_images/test.jpg',
  }
}

function fixture_of_popup(closed = false) {
  return { closed } as Window
}

function sendMessage(data: unknown, origin = GATE_ORIGIN) {
  window.dispatchEvent(new MessageEvent('message', { data, origin }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GateSDK.connectX', () => {
  let fakePopup: { closed: boolean }

  beforeEach(() => {
    vi.useFakeTimers()
    fakePopup = fixture_of_popup(false)
    vi.spyOn(window, 'open').mockReturnValue(fakePopup as Window)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // ── Failure cases ────────────────────────────────────────────────────────

  it('it_should_reject_with_PopupBlockedError_when_window_open_returns_null', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const sdk = fixture_of_gate_sdk()

    await expect(sdk.connectX()).rejects.toBeInstanceOf(PopupBlockedError)
  })

  it('it_should_reject_with_UserCancelledError_when_popup_closes_before_auth', async () => {
    const sdk = fixture_of_gate_sdk()
    const promise = sdk.connectX()
    promise.catch(() => {})

    fakePopup.closed = true
    await vi.advanceTimersByTimeAsync(100)

    await expect(promise).rejects.toBeInstanceOf(UserCancelledError)
  })

  it('it_should_reject_with_ConnectionTimeoutError_when_timeout_expires', async () => {
    const sdk = fixture_of_gate_sdk({ timeoutMs: 1000 })
    const promise = sdk.connectX()
    promise.catch(() => {})

    await vi.advanceTimersByTimeAsync(1001)

    await expect(promise).rejects.toBeInstanceOf(ConnectionTimeoutError)
  })

  it('it_should_reject_with_AuthFailedError_on_gate_x_auth_error_message', async () => {
    const sdk = fixture_of_gate_sdk()
    const promise = sdk.connectX()
    promise.catch(() => {})

    sendMessage({ type: 'gate_x_auth_error', error: 'token exchange failed' })
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toBeInstanceOf(AuthFailedError)
  })

  it('it_should_reject_AuthFailedError_with_the_error_message_from_gate', async () => {
    const sdk = fixture_of_gate_sdk()
    const promise = sdk.connectX()
    promise.catch(() => {})

    sendMessage({ type: 'gate_x_auth_error', error: 'token exchange failed' })
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toThrow('token exchange failed')
  })

  it('it_should_ignore_messages_from_wrong_origin', async () => {
    const sdk = fixture_of_gate_sdk({ timeoutMs: 500 })
    const promise = sdk.connectX()
    promise.catch(() => {})

    sendMessage({ type: 'gate_x_auth_complete', profile: fixture_of_x_profile(), accessToken: 'tok' }, 'https://evil.com')
    await vi.advanceTimersByTimeAsync(600)

    await expect(promise).rejects.toBeInstanceOf(ConnectionTimeoutError)
  })

  // ── Success cases ────────────────────────────────────────────────────────

  it('it_should_resolve_with_profile_and_accessToken_on_gate_x_auth_complete', async () => {
    const sdk = fixture_of_gate_sdk()
    const profile = fixture_of_x_profile()
    const promise = sdk.connectX()

    sendMessage({ type: 'gate_x_auth_complete', profile, accessToken: 'access_tok_123' })
    await vi.runAllTimersAsync()

    const result = await promise
    expect(result.profile).toEqual(profile)
    expect(result.accessToken).toBe('access_tok_123')
  })

  it('it_should_open_popup_at_gateOrigin_slash_connect', () => {
    const sdk = fixture_of_gate_sdk()
    sdk.connectX()

    expect(window.open).toHaveBeenCalledWith(
      `${GATE_ORIGIN}/connect`,
      'gate_x_connect',
      'popup,width=600,height=700',
    )
  })

  it('it_should_not_double_settle_when_popup_closes_after_success', async () => {
    const sdk = fixture_of_gate_sdk()
    const profile = fixture_of_x_profile()
    const promise = sdk.connectX()

    sendMessage({ type: 'gate_x_auth_complete', profile, accessToken: 'tok' })
    await vi.runAllTimersAsync()

    fakePopup.closed = true
    await vi.advanceTimersByTimeAsync(200)

    // Should still resolve (not reject) because success settled first
    await expect(promise).resolves.toMatchObject({ accessToken: 'tok' })
  })
})
