import { describe, it, expect } from 'vitest'
import {
  GateSDKError,
  UserCancelledError,
  ConnectionTimeoutError,
  AuthFailedError,
  PopupBlockedError,
} from '../errors'

describe('GateSDKError', () => {
  it('stores code and message, name = GateSDKError', () => {
    const err = new GateSDKError('something went wrong', 9999)
    expect(err.message).toBe('something went wrong')
    expect(err.code).toBe(9999)
    expect(err.name).toBe('GateSDKError')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('UserCancelledError', () => {
  it('should_have_code_4001_and_default_message', () => {
    const err = new UserCancelledError()
    expect(err.code).toBe(4001)
    expect(err.message).toBe('User cancelled X connection')
    expect(err.name).toBe('UserCancelledError')
    expect(err).toBeInstanceOf(GateSDKError)
  })

  it('should_accept_a_custom_message', () => {
    const err = new UserCancelledError('nope')
    expect(err.message).toBe('nope')
  })
})

describe('ConnectionTimeoutError', () => {
  it('should_have_code_4002_and_default_message', () => {
    const err = new ConnectionTimeoutError()
    expect(err.code).toBe(4002)
    expect(err.message).toBe('X connection timed out')
    expect(err.name).toBe('ConnectionTimeoutError')
    expect(err).toBeInstanceOf(GateSDKError)
  })

  it('should_accept_a_custom_message', () => {
    const err = new ConnectionTimeoutError('took too long')
    expect(err.message).toBe('took too long')
  })
})

describe('AuthFailedError', () => {
  it('should_have_code_4003_and_provided_message', () => {
    const err = new AuthFailedError('token exchange failed')
    expect(err.code).toBe(4003)
    expect(err.message).toBe('token exchange failed')
    expect(err.name).toBe('AuthFailedError')
    expect(err).toBeInstanceOf(GateSDKError)
  })
})

describe('PopupBlockedError', () => {
  it('should_have_code_4004_and_default_message', () => {
    const err = new PopupBlockedError()
    expect(err.code).toBe(4004)
    expect(err.message).toBe('Popup was blocked by the browser')
    expect(err.name).toBe('PopupBlockedError')
    expect(err).toBeInstanceOf(GateSDKError)
  })

  it('should_accept_a_custom_message', () => {
    const err = new PopupBlockedError('blocked')
    expect(err.message).toBe('blocked')
  })
})

describe('instanceof checks', () => {
  it('should_all_be_instanceof_GateSDKError_and_Error', () => {
    const errors = [
      new UserCancelledError(),
      new ConnectionTimeoutError(),
      new AuthFailedError('x'),
      new PopupBlockedError(),
    ]
    for (const err of errors) {
      expect(err).toBeInstanceOf(GateSDKError)
      expect(err).toBeInstanceOf(Error)
    }
  })
})
