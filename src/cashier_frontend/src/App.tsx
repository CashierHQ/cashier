import AppRouter from "./Router";
import { IdentityKitProvider } from "@nfid/identitykit/react";
import "@nfid/identitykit/react/styles.css";
import "./locales/config";
import "./index.css";
import { IdentityKitAuthType } from "@nfid/identitykit";
import { Toaster } from "./components/ui/toaster";
import { NFIDW, InternetIdentity, Stoic } from "@nfid/identitykit";

function App() {
    return (
        <IdentityKitProvider
            featuredSigner={false}
            onConnectFailure={(e: Error) => {
                console.log(e);
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
