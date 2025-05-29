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

const targets = ["jjio5-5aaaa-aaaam-adhaq-cai"];

console.log("ENV", import.meta.env.VITE_IC_EXPLORER_BASE_URL);
console.log(import.meta.env.MODE);
console.log(import.meta.env.VITE_BACKEND_CANISTER_ID);
console.log(import.meta.env.VITE_TOKEN_STORAGE_CANISTER_ID);

// nano second
const TIMEOUT_NANO_SEC = 24n * 60n * 60n * 1_000_000_000n; // 1 day

// milli
const IDLE_TIMEOUT_MILLI_SEC = 15 * 60 * 1_000; // 15 minutes

console.log("TIMEOUT_NANO_SEC", TIMEOUT_NANO_SEC);
console.log("IDLE_TIMEOUT_MILLI_SEC", IDLE_TIMEOUT_MILLI_SEC);

function App() {
    const queryClient = new QueryClient();
    const { signers } = useSignerStore();

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
