import { WalletHeader } from "@/components/wallet-page/header";
import { Outlet, useNavigate } from "react-router-dom";

export function WalletLayout() {
    const navigate = useNavigate();

    const closeWallet = () => navigate("/");

    return (
        <div className="flex flex-col h-dvh">
            <WalletHeader onClose={closeWallet} />
            <Outlet />
        </div>
    );
}
