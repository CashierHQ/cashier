// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
import { BACKEND_CANISTER_ID, TOKEN_STORAGE_CANISTER_ID } from "./const";
// useEffect removed - console logging now handled at build time

const targets = [BACKEND_CANISTER_ID, TOKEN_STORAGE_CANISTER_ID];

// nano second
const TIMEOUT_NANO_SEC = 60n * 60n * 1_000_000_000n; // 1 hour

// milli
const IDLE_TIMEOUT_MILLI_SEC = 15 * 60 * 1_000; // 15 minutes

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
        console.group("🏗️ Build Information");
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
                    idleTimeout: IDLE_TIMEOUT_MILLI_SEC,
                },
                // if derivationOrigin is not null, it will be used to derive the signer
                ...getDerivationOrigin(),
            }}
            discoverExtensionSigners={true}
        >
            <QueryClientProvider client={queryClient}>
                <ImageCacheProvider>
                    <AppRouter />
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
            </QueryClientProvider>
        </IdentityKitProvider>
    );
}

export default App;
