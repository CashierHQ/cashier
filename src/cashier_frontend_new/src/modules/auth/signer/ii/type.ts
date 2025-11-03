export enum Status {
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  ERROR = "ERROR",
}

// copy from windoge98/plug-n-play, they don't export this type
// Global configuration options for Plug and Play
interface GlobalPnpConfig {
  dfxNetwork?: string; // Useful for determining dev environment
  replicaPort?: number;
  solanaNetwork?: string;
  hostUrl?: string;
  delegationTimeout?: bigint;
  delegationTargets?: string[];
  derivationOrigin?: string;
  fetchRootKey?: boolean;
  verifyQuerySignatures?: boolean;
  localStorageKey?: string;
  siwsProviderCanisterId?: string;
  siweProviderCanisterId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapters?: Record<string, any>; // Adapter configurations
  persistenceKey?: string;
  storage?: Storage;
  maxStateHistorySize?: number;
  autoRecoverState?: boolean;
  validateStateOnLoad?: boolean;
}

// copy from windoge98/plug-n-play, they don't export this type
// Configuration options specific to the Internet Identity adapter
export interface IIAdapterConfig extends GlobalPnpConfig {
  localIdentityCanisterId?: string;
  maxTimeToLive?: bigint;
  derivationOrigin?: string;
  iiProviderUrl?: string;
  iiProviderOrigin?: string;
  timeout?: number;
}

// copy from windoge98/plug-n-play, they don't export this function
// Generic type guard factory
function createTypeGuard<T extends GlobalPnpConfig>(
  ...keys: (keyof T)[]
): (config: unknown) => config is T {
  return (config: unknown): config is T => {
    if (!config || typeof config !== "object") return false;
    return keys.some((key) => key in config);
  };
}

// copy from windoge98/plug-n-play, they don't export this function
// Type guard to check if a config is IIAdapterConfig
export const isIIAdapterConfig = createTypeGuard<IIAdapterConfig>(
  "localIdentityCanisterId",
  "iiProviderUrl",
  "iiProviderOrigin",
  "hostUrl",
);
