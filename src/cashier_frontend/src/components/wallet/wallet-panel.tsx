/* eslint-disable react/prop-types */
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

import { WalletTabs } from "@/components/wallet/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokens } from "@/hooks/useTokens";
import { useMemo } from "react";
import { SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { SendReceive } from "../ui/send-receive";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useWalletContext } from "@/contexts/wallet-context";
import SendPanel from "./send-panel";
import ReceivePanel from "./receive-panel";
import DetailsPanel from "./details-panel";
import ManagePanel from "./manage-panel";
import ImportPanel from "./import-panel";
import { formatNumber } from "@/utils/helpers/currency";
import { FungibleToken } from "@/types/fungible-token.speculative";

interface WalletPanelProps {
    onClose: () => void;
}

const MainWalletPanel: React.FC<{
    navigateSendPage: () => void;
    navigateReceivePage: () => void;
    totalUsdEquivalent: number;
}> = ({ navigateSendPage, navigateReceivePage, totalUsdEquivalent }) => {
    // Balance visibility state
    const WALLET_BALANCE_VISIBILITY_KEY = "wallet_balance_visibility";
    const [isVisible, setIsVisible] = useState(() => {
        const savedVisibility = localStorage.getItem(WALLET_BALANCE_VISIBILITY_KEY);
        return savedVisibility ? JSON.parse(savedVisibility) : false;
    });

    useEffect(() => {
        localStorage.setItem(WALLET_BALANCE_VISIBILITY_KEY, JSON.stringify(isVisible));
    }, [isVisible]);

    const usdEquivalentAmount = formatNumber(totalUsdEquivalent.toString());

    return (
        <div className="flex-1 overflow-hidden h-full">
            {/* Custom wallet hero for panel */}
            <div className="flex flex-col items-center pb-5">
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

            <div className="flex-1 overflow-hidden h-full">
                <WalletTabs />
            </div>
        </div>
    );
};

const WalletPanel: React.FC<WalletPanelProps> = ({ onClose }) => {
    const { isLoading, getDisplayTokens, rawTokenList } = useTokens();
    const [filteredTokens, setFilteredTokens] = useState<FungibleToken[]>([]);
    const { activePanel, panelParams, navigateToPanel } = useWalletContext();

    // Update filteredTokens state when tokens change
    useEffect(() => {
        // Only update when not loading to prevent flickering
        if (!isLoading) {
            const displayTokens = getDisplayTokens();
            setFilteredTokens(displayTokens);
        }
    }, [isLoading, rawTokenList, getDisplayTokens]);

    // Calculate the total USD equivalent from the tokens
    const totalUsdEquivalent = useMemo(() => {
        if (!filteredTokens || filteredTokens.length === 0) return 0;

        const total = filteredTokens.reduce((total, token) => {
            return total + (token.usdEquivalent || 0);
        }, 0);

        return Number(total.toFixed(2));
    }, [filteredTokens]);

    const navigateReceivePage = () => {
        navigateToPanel("receive");
    };

    const navigateSendPage = () => {
        navigateToPanel("send");
    };

    const navigateToMainWallet = () => {
        navigateToPanel("wallet");
    };

    // Render panel content based on active panel type
    const renderPanelContent = () => {
        if (isLoading && activePanel === "wallet") {
            return (
                <div className="flex-1 overflow-hidden h-full">
                    <div className="p-4">
                        <Skeleton className="h-8 w-[150px] mb-2" />
                        <Skeleton className="h-12 w-[180px]" />
                    </div>
                    <div className="p-4">
                        <Skeleton className="h-10 w-full mb-4" />
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="flex justify-between items-center mb-4">
                                <div className="flex items-center">
                                    <Skeleton className="h-9 w-9 rounded-full mr-2" />
                                    <div>
                                        <Skeleton className="h-4 w-[100px] mb-2" />
                                        <Skeleton className="h-3 w-[70px]" />
                                    </div>
                                </div>
                                <div>
                                    <Skeleton className="h-4 w-[80px] mb-2" />
                                    <Skeleton className="h-3 w-[60px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        switch (activePanel) {
            case "send":
                return <SendPanel tokenId={panelParams.tokenId} onBack={navigateToMainWallet} />;
            case "receive":
                return <ReceivePanel tokenId={panelParams.tokenId} onBack={navigateToMainWallet} />;
            case "details":
                return <DetailsPanel tokenId={panelParams.tokenId} onBack={navigateToMainWallet} />;
            case "manage":
                return <ManagePanel onBack={navigateToMainWallet} />;
            case "import":
                return <ImportPanel onBack={() => navigateToPanel("manage")} />;
            case "wallet":
            default:
                return (
                    <MainWalletPanel
                        navigateSendPage={navigateSendPage}
                        navigateReceivePage={navigateReceivePage}
                        totalUsdEquivalent={totalUsdEquivalent}
                    />
                );
        }
    };

    // Show loading skeleton when tokens are loading
    if (isLoading && activePanel === "wallet") {
        return (
            <SheetContent side="right" className="w-[100%] p-4 flex flex-col h-full">
                <SheetHeader>
                    <SheetTitle className="flex justify-between items-center">
                        <span>Wallet</span>
                        <SheetClose asChild>
                            <button
                                onClick={onClose}
                                className="rounded-full p-1 hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </SheetClose>
                    </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-hidden h-full">
                    <div className="p-4">
                        <Skeleton className="h-8 w-[150px] mb-2" />
                        <Skeleton className="h-12 w-[180px]" />
                    </div>
                    <div className="p-4">
                        <Skeleton className="h-10 w-full mb-4" />
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="flex justify-between items-center mb-4">
                                <div className="flex items-center">
                                    <Skeleton className="h-9 w-9 rounded-full mr-2" />
                                    <div>
                                        <Skeleton className="h-4 w-[100px] mb-2" />
                                        <Skeleton className="h-3 w-[70px]" />
                                    </div>
                                </div>
                                <div>
                                    <Skeleton className="h-4 w-[80px] mb-2" />
                                    <Skeleton className="h-3 w-[60px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </SheetContent>
        );
    }

    return (
        <SheetContent
            side="right"
            hideCloseButton={activePanel !== "wallet"}
            className="w-[100%] py-4 px-2 flex flex-col h-full"
        >
            {activePanel === "wallet" && (
                <SheetHeader>
                    <SheetTitle className="flex justify-between items-center">
                        <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                    </SheetTitle>
                </SheetHeader>
            )}
            {renderPanelContent()}
        </SheetContent>
    );
};

export default WalletPanel;
