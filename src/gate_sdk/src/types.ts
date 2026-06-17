export interface XProfile {
  id: string
  username: string
  name: string
  profile_image_url: string
}

export interface ConnectXResult {
  profile: XProfile
  accessToken: string
}

export interface GateSDKConfig {
  /** Full origin of the Gate FE canister, e.g. https://gate.icp0.io */
  gateOrigin: string
  /** Interval in ms for checking whether the popup was closed. Default: 500 */
  popupCheckIntervalMs?: number
  /** Overall timeout for connectX() in ms. Default: 300_000 (5 min) */
  timeoutMs?: number
}

export interface GateAuthCompleteMessage {
  type: 'gate_x_auth_complete'
  profile: XProfile
  accessToken: string
}

export interface GateAuthErrorMessage {
  type: 'gate_x_auth_error'
  error: string
}

export type GateMessage = GateAuthCompleteMessage | GateAuthErrorMessage
