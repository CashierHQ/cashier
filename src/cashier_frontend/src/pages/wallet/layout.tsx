import { WalletHeader } from "@/components/wallet/header";
import { Outlet, useNavigate } from "react-router-dom";
import { useResponsive } from "@/hooks/responsive-hook";
import { MainAppLayout } from "@/components/ui/main-app-layout";

export default function WalletLayout() {
    const navigate = useNavigate();
    const responsive = useResponsive();

    const closeWallet = () => navigate("/");

    return (
        <MainAppLayout>
            {/* <WalletHeader onClose={closeWallet} /> */}
            <div className="flex-1 w-full overflow-hidden">
                <Outlet />
            </div>
        </MainAppLayout>
    );
}
