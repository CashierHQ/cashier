import React from "react";
import AppRouter from "./Router";
import { IdentityKitProvider } from "@nfid/identitykit/react";
import "@nfid/identitykit/react/styles.css";
import "./locales/config";
import "./index.css";
import { IdentityKitAuthType } from "@nfid/identitykit";
import { Toaster } from "./components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignersProvider, useSigners } from "./contexts/signer-list-context";
import { HelmetProvider } from "react-helmet-async";

const targets = ["jjio5-5aaaa-aaaam-adhaq-cai"];

console.log("ENV", import.meta.env.VITE_IC_EXPLORER_BASE_URL);
console.log(import.meta.env.MODE);

function App() {
    const queryClient = new QueryClient();
    const { signers } = useSigners();
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
                maxTimeToLive: 3_600_000_000_000n,
            }}
        >
            <QueryClientProvider client={queryClient}>
                <HelmetProvider>
                    <AppRouter />
                    <Toaster />
                </HelmetProvider>
            </QueryClientProvider>
        </IdentityKitProvider>
    );
}

export default function AppWithProviders() {
    return (
        <SignersProvider>
            <App />
        </SignersProvider>
    );
}
