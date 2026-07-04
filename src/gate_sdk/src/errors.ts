export class GateSDKError extends Error {
  readonly code: number
  constructor(message: string, code: number) {
    super(message)
    this.name = 'GateSDKError'
    this.code = code
  }
}

/** User closed the popup before completing OAuth. */
export class UserCancelledError extends GateSDKError {
  constructor(message = 'User cancelled X connection') {
    super(message, 4001)
    this.name = 'UserCancelledError'
  }
}

/** connectX() timed out waiting for the popup to complete. */
export class ConnectionTimeoutError extends GateSDKError {
  constructor(message = 'X connection timed out') {
    super(message, 4002)
    this.name = 'ConnectionTimeoutError'
  }
}

/** The Gate FE reported an error during OAuth or token exchange. */
export class AuthFailedError extends GateSDKError {
  constructor(message: string) {
    super(message, 4003)
    this.name = 'AuthFailedError'
  }
}

/** The browser blocked window.open() for the Gate FE popup. */
export class PopupBlockedError extends GateSDKError {
  constructor(message = 'Popup was blocked by the browser') {
    super(message, 4004)
    this.name = 'PopupBlockedError'
  }
}
