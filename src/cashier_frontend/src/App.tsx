import AppRouter from "./Router";
import { IdentityKitProvider, useIdentityKit } from "@nfid/identitykit/react";
import "@nfid/identitykit/react/styles.css";
import "./locales/config";
import "./index.css";
import { IdentityKitAuthType } from "@nfid/identitykit";
import { Toaster } from "./components/ui/toaster";
import { NFIDW, InternetIdentity, Stoic } from "@nfid/identitykit";
import { useEffect } from "react";

function App() {
    useEffect(() => {
        const isMobile = () => {
            if (
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    navigator.userAgent,
                )
            ) {
                return true;
            } else {
                return false;
            }
        };

        if (isMobile()) {
            alert("isMobile");
        } else {
            alert("isNotMobile");
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
            signers={[NFIDW, InternetIdentity, Stoic]}
        >
            <AppRouter />
            <Toaster />
        </IdentityKitProvider>
    );
}

export default App;
