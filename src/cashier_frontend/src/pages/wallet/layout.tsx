import { WalletHeader } from "@/components/wallet/header";
import { Outlet, useNavigate } from "react-router-dom";
import { useResponsive } from "@/hooks/responsive-hook";

export default function WalletLayout() {
    const navigate = useNavigate();
    const responsive = useResponsive();

    const closeWallet = () => navigate("/");

    return (
        <div className="flex flex-col h-dvh min-w-[280px] flex-1 mx-auto">
            <WalletHeader onClose={closeWallet} />

            <div
                className={`flex-1 overflow-hidden ${responsive.isSmallDevice ? "bg-white" : "bg-lightgreen"}`}
            >
                <Outlet />
            </div>
        </div>
    );
}
