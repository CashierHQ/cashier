import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SendReceive } from "../ui/send-receive";
import { prettyNumber } from "@/utils/helpers/number/pretty";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import { useResponsive } from "@/hooks/responsive-hook";

interface WalletHeroProps {
    totalUsdEquivalent: number;
}

export function WalletHero({ totalUsdEquivalent }: WalletHeroProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const responsive = useResponsive();

    const WALLET_BALANCE_VISIBILITY_KEY = "wallet_balance_visibility";
    const [isVisible, setIsVisible] = useState(() => {
        const savedVisibility = localStorage.getItem(WALLET_BALANCE_VISIBILITY_KEY);
        return savedVisibility ? JSON.parse(savedVisibility) : false;
    });

    useEffect(() => {
        localStorage.setItem(WALLET_BALANCE_VISIBILITY_KEY, JSON.stringify(isVisible));
    }, [isVisible]);

    const usdEquivalentAmount = prettyNumber(totalUsdEquivalent);

    const navigateReceivePage = () => navigate(`/wallet/receive`);
    const navigateSendPage = () => navigate(`/wallet/send`);

    return (
        <div className="flex flex-col items-center px-4 pt-6 pb-5">
            <div className="relative w-full">
                {!responsive.isSmallDevice && (
                    <div className="absolute left-0">
                        <button onClick={() => navigate("/")}>
                            <ChevronLeft size={24} />
                        </button>
                    </div>
                )}
                <h1 className="text-center text-[18px] font-regular leading-none">
                    {t("wallet.details.header")}
                </h1>
            </div>

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
