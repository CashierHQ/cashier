/**
 * Base error class for all wallet SDK errors.
 * @param message - Human-readable description of the error.
 * @param code - Numeric error code (mirrors JSON-RPC error codes where applicable).
 */
export class WalletError extends Error {
  readonly code: number

  constructor(message: string, code: number) {
    super(message)
    this.name = 'WalletError'
    this.code = code
  }
}

/** User explicitly rejected the request in the consent popup (code 4001) */
export class UserRejectedError extends WalletError {
  constructor(message = 'User rejected the request') {
    super(message, 4001)
    this.name = 'UserRejectedError'
  }
}

/** The wallet requires authentication before this method can be called (code 4100) */
export class NotAuthenticatedError extends WalletError {
  constructor(message = 'Not authenticated') {
    super(message, 4100)
    this.name = 'NotAuthenticatedError'
  }
}

/** The wallet does not recognise the requested method (code -32601) */
export class MethodNotFoundError extends WalletError {
  constructor(method: string) {
    super(`Method not found: ${method}`, -32601)
    this.name = 'MethodNotFoundError'
  }
}

/** The wallet is not connected / handshake has not completed */
export class NotConnectedError extends WalletError {
  constructor(message = 'Wallet bridge not connected') {
    super(message, -1)
    this.name = 'NotConnectedError'
  }
}

/** The consent popup was blocked or closed before a decision was made */
export class ConsentTimeoutError extends WalletError {
  constructor(message = 'Consent popup closed without a decision') {
    super(message, 4002)
    this.name = 'ConsentTimeoutError'
  }
}
