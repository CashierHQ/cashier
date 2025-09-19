import { createPNPConfig } from "@windoge98/plug-n-play";
import {
  BACKEND_CANISTER_ID,
  FEATURE_FLAGS,
  IC_HOST,
  IC_INTERNET_IDENTITY_PROVIDER,
  TIMEOUT_NANO_SEC,
  TOKEN_STORAGE_CANISTER_ID,
} from "./const";
import { IIAdapter } from "./services/plugAndPlay";
import { GlobalPnpConfig } from "./services/plugAndPlay/adapter";

const TARGETS = [BACKEND_CANISTER_ID, TOKEN_STORAGE_CANISTER_ID];

const OTHER_WALLET_COFNIG_ADAPTER = createPNPConfig({
  adapters: {
    plug: { enabled: true },
    stoic: { enabled: true },
    oisy: { enabled: true },
  }
}).adapters;

export const CONFIG: GlobalPnpConfig = {
  dfxNetwork: FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER ? "local" : "ic",
  replicaPort: FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER ? 8000 : undefined,
  hostUrl: IC_HOST,
  delegationTimeout: TIMEOUT_NANO_SEC,
  delegationTargets: TARGETS,
  fetchRootKey: FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER,
  verifyQuerySignatures: false,
  adapters: {
    iiSigner: {
      enabled: true,
      walletName: "Internet Identity",
      logo: "123",
      website: "https://internetcomputer.org",
      chain: "ICP",
      adapter: IIAdapter,
      config: {
        // url to the provider
        iiProviderUrl: IC_INTERNET_IDENTITY_PROVIDER,
        hostUrl: IC_HOST,
        shouldFetchRootKey: FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER,
        // set derivationOrigin for production only
        // this setting allow www.cashierapp.io have the same identity as cashierapp.io
        ...(import.meta.env.MODE === "production" && {
          derivationOrigin: "https://cashierapp.io",
        }),
      },
    },
    ...OTHER_WALLET_COFNIG_ADAPTER
  },
};

