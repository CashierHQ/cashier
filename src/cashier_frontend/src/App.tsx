// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import AppRouter from "./Router";
import { IdentityKitProvider } from "@nfid/identitykit/react";
import "@nfid/identitykit/react/styles.css";
import "./locales/config";
import "./index.css";
import { IdentityKitAuthType } from "@nfid/identitykit";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSignerStore } from "./stores/signerStore";
import { ImageCacheProvider } from "@/contexts/image-cache-context";
import { IdleTimeoutProvider } from "@/contexts/IdleTimeoutProvider";
import { BACKEND_CANISTER_ID, TOKEN_STORAGE_CANISTER_ID } from "./const";
// useEffect removed - console logging now handled at build time
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const targets = [BACKEND_CANISTER_ID, TOKEN_STORAGE_CANISTER_ID];

// nano second
export const TIMEOUT_NANO_SEC = 60n * 60n * 1_000_000_000n; // 1 hour

// milli
export const IDLE_TIMEOUT_MILLI_SEC = 15 * 60 * 1_000; // 15 minutes

// only apply for production
const getDerivationOrigin = () => {
    if (import.meta.env.MODE === "production") {
        return {
            derivationOrigin: "https://cashierapp.io",
        };
    }

    return {};
};
const logBuildInfo = () => {
    const buildInfo = {
        appVersion: __APP_VERSION__,
        buildHash: __BUILD_HASH__,
    };

    if (import.meta.env.MODE === "dev") {
        console.log("App Version:", buildInfo.appVersion);
        console.log("Build Hash:", buildInfo.buildHash);
    }
};

logBuildInfo();

function App() {
    const queryClient = new QueryClient();
    const { signers } = useSignerStore();

    // Console logging is now handled at build time via vite.config.js esbuild.pure option
    // No need for runtime console manipulation

    return (
        <IdentityKitProvider
            featuredSigner={false}
            onConnectFailure={(e: Error) => {
                console.log("Connect to Identity fail: " + e);
            }}
            onConnectSuccess={() => {}}
            onDisconnect={() => {
                queryClient.clear();
            }}
            authType={IdentityKitAuthType.DELEGATION}
            signers={signers}
            signerClientOptions={{
                targets,
                maxTimeToLive: TIMEOUT_NANO_SEC,
                idleOptions: {
                    idleTimeout: IDLE_TIMEOUT_MILLI_SEC * 2,
                },
                // if derivationOrigin is not null, it will be used to derive the signer
                ...getDerivationOrigin(),
            }}
            discoverExtensionSigners={true}
        >
            <QueryClientProvider client={queryClient}>
                <ImageCacheProvider>
                    <IdleTimeoutProvider>
                        <AppRouter />
                    </IdleTimeoutProvider>
                </ImageCacheProvider>
                <Toaster
                    position="top-center"
                    expand={true}
                    richColors={true}
                    toastOptions={{
                        classNames: {
                            toast: "toast",
                            title: "title",
                            description: "description",
                            actionButton: "action-button",
                            cancelButton: "cancel-button",
                            closeButton: "close-button",
                        },
                    }}
                />
                <ReactQueryDevtools initialIsOpen={true} />
            </QueryClientProvider>
        </IdentityKitProvider>
    );
}

export default App;
