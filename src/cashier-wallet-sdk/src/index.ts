export { WalletSDK } from "./WalletSDK";
export { RpcClient } from "./RpcClient";
export {
  WalletError,
  UserRejectedError,
  NotAuthenticatedError,
  MethodNotFoundError,
  NotConnectedError,
  ConsentTimeoutError,
} from "./errors";
export type {
  WalletSDKConfig,
  WalletSDKEvents,
  AuthState,
  SignResult,
  TransferParams,
  TransferResult,
  ConnectInfo,
  RpcRequest,
  RpcResponse,
  RpcError,
  ConsentChannelMessage,
} from "./types";

// ── ICRC-29 iframe transport (used by PNP adapters in consuming apps) ────
export { IframeTransport } from "./IframeTransport";
export type { IframeTransportOptions } from "./IframeTransport";

// ── PNP adapter for Cashier Wallet ────────────────────────────────────────
export { CashierWalletSignerAdapter } from "./CashierWalletSignerAdapter";
export type { CashierWalletAdapterConfig } from "./CashierWalletSignerAdapter";
