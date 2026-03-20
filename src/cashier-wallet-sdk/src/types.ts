// ─── Internal client types ──────────────────────────────────────────────────

/** Callbacks for a pending JSON-RPC request awaiting a response from the wallet. */
export type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

// ─── RPC wire types ────────────────────────────────────────────────────────

/** A JSON-RPC 2.0 request sent from the SDK to the wallet via postMessage. */
export interface RpcRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: unknown;
}

/** A JSON-RPC 2.0 response sent from the wallet back to the SDK via postMessage. */
export interface RpcResponse {
  jsonrpc: "2.0";
  id: string;
  result?: unknown;
  error?: RpcError;
}

/** JSON-RPC 2.0 error object included in an {@link RpcResponse} when a call fails. */
export interface RpcError {
  /** Numeric error code (e.g. 4001 for user rejection, -32601 for method not found). */
  code: number;
  message: string;
}

// ─── SDK configuration ──────────────────────────────────────────────────────

export interface WalletSDKConfig {
  /**
   * Full origin of the wallet app.
   * Defaults to http://localhost:5177 for local development.
   * Override with the production wallet URL before publishing.
   */
  walletOrigin?: string;
}

// ─── Public API return types ────────────────────────────────────────────────

/** Metadata returned by the wallet on a successful `connect` handshake. */
export interface ConnectInfo {
  status: string;
  walletOrigin: string;
  version: string;
}

/** Current authentication state of the wallet session. */
export interface AuthState {
  authenticated: boolean;
  /** Textual representation of the Internet Identity principal, or empty string when not authenticated. */
  principal: string;
}

/** Result returned by {@link WalletSDK.signMessage}. */
export interface SignResult {
  /** Hex-encoded signature bytes. */
  signature: string;
  /** Textual principal of the identity that produced the signature. */
  principal: string;
}

/** Parameters for an ICRC-1 token transfer. */
export interface TransferParams {
  /** Textual canister ID of the ICRC-1 token ledger. */
  canisterId: string;
  /** Recipient principal in textual form. */
  to: string;
  /** Amount in the smallest token unit (e.g. e8s for ICP). */
  amount: bigint;
}

/** Result returned by {@link WalletSDK.icrc1Transfer}. */
export interface TransferResult {
  /** Ledger block index at which the transfer was recorded. */
  blockIndex: bigint;
}

// ─── SDK event map ──────────────────────────────────────────────────────────

export interface WalletSDKEvents {
  /** Emitted once the ICRC-29 handshake with the wallet iframe succeeds */
  connected: undefined;
  /** Emitted when the SDK is torn down via unmount() */
  disconnected: undefined;
  /** Emitted whenever authentication state changes (login / logout) */
  authChange: AuthState;
}

// ─── Consent channel messages ───────────────────────────────────────────────

/** Sent by the consent popup to request the pending operation details. */
export interface ConsentGetMessage {
  type: "consent_get";
  consentId: string;
}

/** Sent by the wallet iframe in response to {@link ConsentGetMessage}, carrying the operation details to display. */
export interface ConsentDataMessage {
  type: "consent_data";
  consentId: string;
  method: string;
  params: unknown;
}

/** Sent by the consent popup when the user approves the operation. */
export interface ConsentApprovedMessage {
  type: "consent_approved";
  consentId: string;
}

/** Sent by the consent popup when the user rejects the operation. */
export interface ConsentRejectedMessage {
  type: "consent_rejected";
  consentId: string;
}

/** Union of all messages exchanged over the wallet consent BroadcastChannel. */
export type ConsentChannelMessage =
  | ConsentGetMessage
  | ConsentDataMessage
  | ConsentApprovedMessage
  | ConsentRejectedMessage;
