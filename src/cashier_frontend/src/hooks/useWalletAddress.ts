import { useAuth } from "@nfid/identitykit/react";

export function useWalletAddress() {
    const { user } = useAuth();
    return user ? user.principal.toText() : "";
}
