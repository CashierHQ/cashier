// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { useState, useEffect } from "react";
import { SendReceive } from "../ui/send-receive";
import { Eye, EyeOff } from "lucide-react";
import { useWalletContext } from "@/contexts/wallet-context";
import { formatNumber } from "@/utils/helpers/currency";

interface WalletHeroProps {
    totalUsdEquivalent: number;
}

export function WalletHero({ totalUsdEquivalent }: WalletHeroProps) {
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
