import { Outlet } from "react-router-dom";
import { WalletHeader } from "./wallet-header";

export function WalletLayout() {
    return (
        <div className="flex flex-col h-dvh">
            <WalletHeader />
            <Outlet />
        </div>
    );
}
