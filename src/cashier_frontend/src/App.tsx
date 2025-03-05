import AppRouter from "./Router";
import { IdentityKitProvider } from "@nfid/identitykit/react";
import "@nfid/identitykit/react/styles.css";
import "./locales/config";
import "./index.css";
import { IdentityKitAuthType } from "@nfid/identitykit";
import { Toaster } from "./components/ui/toaster";
import { InternetIdentity } from "@nfid/identitykit";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const isMobile = () => {
    if (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    ) {
        return true;
    } else {
        return false;
    }
};

const targets = ["jjio5-5aaaa-aaaam-adhaq-cai"];

console.log("ENV", import.meta.env.VITE_IC_EXPLORER_BASE_URL);

function App() {
    const queryClient = new QueryClient();
    useEffect(() => {
        if (!isMobile()) {
            // listSigners.push(Plug);
        }
    }, []);
    console.log(import.meta.env.MODE);
    return (
        <IdentityKitProvider
            featuredSigner={false}
            onConnectFailure={(e: Error) => {
                console.log("Connect to Identity fail: " + e);
            }}
            onConnectSuccess={() => {}}
            onDisconnect={() => {
                console.log("Log out");
                queryClient.clear();
            }}
            authType={IdentityKitAuthType.DELEGATION}
            signers={isMobile() ? [InternetIdentity] : [InternetIdentity]}
            signerClientOptions={{
                targets,
            }}
        >
            <QueryClientProvider client={queryClient}>
                <AppRouter />
                <Toaster />
            </QueryClientProvider>
        </IdentityKitProvider>
    );
}

export default App;
