import { WalletHeader } from "@/components/wallet/header";
import { Outlet, useNavigate } from "react-router-dom";
import { useResponsive } from "@/hooks/responsive-hook";

export default function WalletLayout() {
    const navigate = useNavigate();
    const responsive = useResponsive();

    const closeWallet = () => navigate("/");

    return (
        <div
            className={`flex flex-col ${responsive.isSmallDevice ? "px-2 py-4 h-dvh" : "max-h-[90%] h-full w-[600px] p-2 mt-8 items-center bg-[white] rounded-md drop-shadow-md mx-auto"}`}
        >
            <WalletHeader onClose={closeWallet} />
            <div className="flex-1 w-full overflow-hidden">
                <Outlet />
            </div>
        </div>
    );
}
