import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SendReceive } from "../ui/send-receive";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useResponsive } from "@/hooks/responsive-hook";
import { useWalletContext } from "@/contexts/wallet-context";
import { formatNumber } from "@/utils/helpers/currency";

interface WalletHeroProps {
    totalUsdEquivalent: number;
}

export function WalletHero({ totalUsdEquivalent }: WalletHeroProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const responsive = useResponsive();
    const { navigateToPanel } = useWalletContext();

    const WALLET_BALANCE_VISIBILITY_KEY = "wallet_balance_visibility";
    const [isVisible, setIsVisible] = useState(() => {
        const savedVisibility = localStorage.getItem(WALLET_BALANCE_VISIBILITY_KEY);
        return savedVisibility ? JSON.parse(savedVisibility) : false;
    });

    useEffect(() => {
        localStorage.setItem(WALLET_BALANCE_VISIBILITY_KEY, JSON.stringify(isVisible));
    }, [isVisible]);

    const usdEquivalentAmount = formatNumber(totalUsdEquivalent.toString());

    const navigateReceivePage = () => navigateToPanel("receive");
    const navigateSendPage = () => navigateToPanel("send");

    return (
        <div className="flex flex-col items-center pb-5">
            {/* <div className="relative w-full">
                <h1 className="text-center text-[18px] font-regular leading-none">
                    {t("wallet.details.header")}
                </h1>
            </div> */}

            <div className="relative flex items-center gap-2">
                <span className="text-[32px] font-semibold">
                    ${isVisible ? usdEquivalentAmount : "∗∗∗∗"}
                </span>

                <button className="" onClick={() => setIsVisible(!isVisible)}>
                    {isVisible ? (
                        <EyeOff size={24} className="stroke-grey" />
                    ) : (
                        <Eye size={24} className="stroke-grey" />
                    )}
                </button>
            </div>

            <SendReceive onSend={navigateSendPage} onReceive={navigateReceivePage} />
        </div>
    );
}
