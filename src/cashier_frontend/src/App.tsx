import AppRouter from "./Router";
import { IdentityKitProvider } from "@nfid/identitykit/react";
import "@nfid/identitykit/react/styles.css";
import "./locales/config";
import "./index.css";

function App() {
    return (
        <IdentityKitProvider
            featuredSigner={false}
            onConnectFailure={(e: Error) => {
                console.log(e);
            }}
            onConnectSuccess={() => {}}
            onDisconnect={() => {}}
        >
            <AppRouter />
        </IdentityKitProvider>
    );
}

export default App;
