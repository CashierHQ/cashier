import { describe, it, expect } from 'vitest'
import {
  WalletError,
  UserRejectedError,
  NotAuthenticatedError,
  MethodNotFoundError,
  NotConnectedError,
  ConsentTimeoutError,
} from '../errors'

describe('WalletError', () => {
  it('stores code and message, name = WalletError', () => {
    const err = new WalletError('something went wrong', 1234)
    expect(err.message).toBe('something went wrong')
    expect(err.code).toBe(1234)
    expect(err.name).toBe('WalletError')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('UserRejectedError', () => {
  it('has code 4001 and default message', () => {
    const err = new UserRejectedError()
    expect(err.code).toBe(4001)
    expect(err.message).toBe('User rejected the request')
    expect(err.name).toBe('UserRejectedError')
    expect(err).toBeInstanceOf(WalletError)
  })

  it('accepts a custom message', () => {
    const err = new UserRejectedError('nope')
    expect(err.message).toBe('nope')
  })
})

describe('NotAuthenticatedError', () => {
  it('has code 4100 and default message', () => {
    const err = new NotAuthenticatedError()
    expect(err.code).toBe(4100)
    expect(err.message).toBe('Not authenticated')
    expect(err.name).toBe('NotAuthenticatedError')
    expect(err).toBeInstanceOf(WalletError)
  })

  it('accepts a custom message', () => {
    const err = new NotAuthenticatedError('login first')
    expect(err.message).toBe('login first')
  })
})

describe('MethodNotFoundError', () => {
  it('has code -32601 and includes method name in message', () => {
    const err = new MethodNotFoundError('my_method')
    expect(err.code).toBe(-32601)
    expect(err.message).toContain('my_method')
    expect(err.name).toBe('MethodNotFoundError')
    expect(err).toBeInstanceOf(WalletError)
  })
})

describe('NotConnectedError', () => {
  it('has code -1 and default message', () => {
    const err = new NotConnectedError()
    expect(err.code).toBe(-1)
    expect(err.message).toBe('Wallet bridge not connected')
    expect(err.name).toBe('NotConnectedError')
    expect(err).toBeInstanceOf(WalletError)
  })

  it('accepts a custom message', () => {
    const err = new NotConnectedError('call mount() first')
    expect(err.message).toBe('call mount() first')
  })
})

describe('ConsentTimeoutError', () => {
  it('has code 4002 and default message', () => {
    const err = new ConsentTimeoutError()
    expect(err.code).toBe(4002)
    expect(err.message).toBe('Consent popup closed without a decision')
    expect(err.name).toBe('ConsentTimeoutError')
    expect(err).toBeInstanceOf(WalletError)
  })

  it('accepts a custom message', () => {
    const err = new ConsentTimeoutError('popup was blocked')
    expect(err.message).toBe('popup was blocked')
  })
})

describe('instanceof checks', () => {
  it('all subclasses are instanceof WalletError and Error', () => {
    const errors = [
      new UserRejectedError(),
      new NotAuthenticatedError(),
      new MethodNotFoundError('x'),
      new NotConnectedError(),
      new ConsentTimeoutError(),
    ]
    for (const err of errors) {
      expect(err).toBeInstanceOf(WalletError)
      expect(err).toBeInstanceOf(Error)
    }
  })
})
