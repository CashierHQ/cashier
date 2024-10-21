import AppRouter from "./Router";
import { IdentityKitProvider, useIdentityKit } from "@nfid/identitykit/react";
import "@nfid/identitykit/react/styles.css";
import "./locales/config";
import "./index.css";
import { IdentityKitAuthType, Plug } from "@nfid/identitykit";
import { Toaster } from "./components/ui/toaster";
import { NFIDW, InternetIdentity, Stoic } from "@nfid/identitykit";
import { useEffect } from "react";

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

function App() {
    useEffect(() => {
        if (!isMobile()) {
            // listSigners.push(Plug);
        }
    }, []);
    return (
        <IdentityKitProvider
            featuredSigner={false}
            onConnectFailure={(e: Error) => {
                console.log("Connect to Identity fail: " + e);
            }}
            onConnectSuccess={() => {}}
            onDisconnect={() => {}}
            authType={IdentityKitAuthType.DELEGATION}
            signers={
                isMobile()
                    ? [NFIDW, InternetIdentity, Stoic]
                    : [NFIDW, InternetIdentity, Stoic, Plug]
            }
            signerClientOptions={{
                targets,
            }}
        >
            <AppRouter />
            <Toaster />
        </IdentityKitProvider>
    );
}

export default App;
