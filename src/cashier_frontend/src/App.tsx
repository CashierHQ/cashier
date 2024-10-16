import AppRouter from "./Router";
import { IdentityKitProvider, useIdentityKit } from "@nfid/identitykit/react";
import "@nfid/identitykit/react/styles.css";
import "./locales/config";
import "./index.css";
import { IdentityKitAuthType } from "@nfid/identitykit";
import { Toaster } from "./components/ui/toaster";
import { NFIDW, InternetIdentity, Stoic } from "@nfid/identitykit";


function App() {
    const { connect } = useIdentityKit();

    return (
        <IdentityKitProvider
            featuredSigner={false}
            onConnectFailure={(e: Error) => {
                console.log("Connect to Identity fail: " + e);
            }}
            onConnectSuccess={() => {}}
            onDisconnect={() => {
                console.log("Disconnected");
                console.log("Try to login");
                connect();
            }}
            authType={IdentityKitAuthType.DELEGATION}
            signers={[NFIDW, InternetIdentity, Stoic]}
        >
            <AppRouter />
            <Toaster />
        </IdentityKitProvider>
    );
}

export default App;
