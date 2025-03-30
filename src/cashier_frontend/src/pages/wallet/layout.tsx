import { WalletHeader } from "@/components/wallet/header";
import { Outlet, useNavigate } from "react-router-dom";

export default function WalletLayout() {
    const navigate = useNavigate();

    const closeWallet = () => navigate("/");

    return (
        <div className="flex flex-col h-dvh flex-grow max-w-[400px] bg-white">
            <WalletHeader onClose={closeWallet} />
            <Outlet />
        </div>
    );
}
