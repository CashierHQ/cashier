import { ConfigBuilder } from "@windoge98/plug-n-play";
import { BACKEND_CANISTER_ID, FEATURE_FLAGS, IC_INTERNET_IDENTITY_PROVIDER, TIMEOUT_NANO_SEC, TOKEN_STORAGE_CANISTER_ID } from "./const";
import { IIAdapter } from "./services/plugAndPlay";

const TARGETS = [BACKEND_CANISTER_ID, TOKEN_STORAGE_CANISTER_ID];

export const PNP_CONFIG =
    ConfigBuilder.create()
        .withEnvironment(
            FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER ? "local" : "ic",
            {
                // if local, set ports for local dfx and frontend
                ...(FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER && {
                    replica: 8000,
                    frontend: 3000,
                })
            },
        )
        .withSecurity(
            // fetch root key only for local, not for production
            FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER,
            // verify query (we doesn't use this, so set to false by default)
            false
        )
        .withAdapter('ii', {
            enabled: true,
            walletName: "Internet Identity",
            logo: "",
            website: "https://internetcomputer.org",
            chain: "ICP",
            adapter: IIAdapter,
            config: {
                // url to the provider
                iiProviderUrl: IC_INTERNET_IDENTITY_PROVIDER,
                // set derivationOrigin for production only
                // this setting allow www.cashierapp.io have the same identity as cashierapp.io
                ...(import.meta.env.MODE === "production" && { derivationOrigin: "https://cashierapp.io", })
            },
        })
        .withDelegation({
            // timeout of delegation in nano sec
            timeout: TIMEOUT_NANO_SEC,
            // list of canister id that we will request delegation for
            targets: TARGETS,
        })
        .build()