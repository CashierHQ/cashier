// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/* eslint-disable react/prop-types */

import { WalletTabs } from "@/components/wallet/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokens } from "@/hooks/useTokens";
import { useEffect, useMemo, useCallback } from "react";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SendReceive } from "../ui/send-receive";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useWalletContext } from "@/contexts/wallet-context";
import SendPanel from "./send-panel";
import ReceivePanel from "./receive-panel";
import DetailsPanel from "./details-panel";
import ManagePanel from "./manage-panel";
import ImportPanel from "./import-panel";
import { formatNumber } from "@/utils/helpers/currency";
import React from "react";

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

    const usdEquivalentAmount = useMemo(
        () => formatNumber(totalUsdEquivalent.toString()),
        [totalUsdEquivalent],
    );

    const toggleVisibility = useCallback(() => {
        setIsVisible((prev: boolean) => !prev);
    }, []);

    return (
        <div className="flex-1 overflow-hidden h-full">
            {/* Custom wallet hero for panel */}
            <div className="flex flex-col items-center pb-5">
                <div className="relative flex items-center gap-2">
                    <span className="text-[32px] font-semibold">
                        ${isVisible ? usdEquivalentAmount : "∗∗∗∗"}
                    </span>

                    <button className="" onClick={toggleVisibility}>
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

// Memoize panel components

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WalletPanel: React.FC<WalletPanelProps> = ({ onClose }) => {
    const { isLoading, getDisplayTokens, rawTokenList } = useTokens();
    const { activePanel, panelParams, navigateToPanel } = useWalletContext();

    // Use useMemo for filteredTokens instead of useState + useEffect
    const filteredTokens = useMemo(() => {
        // Make sure we have tokens to work with
        if (!rawTokenList || rawTokenList.length === 0) {
            console.log("WalletPanel: No tokens in rawTokenList");
            return [];
        }

        // Get tokens that should be displayed based on filters
        const displayTokens = getDisplayTokens();
        return displayTokens;
    }, [rawTokenList, getDisplayTokens]);

    // Calculate the total USD equivalent from the tokens
    const totalUsdEquivalent = useMemo(() => {
        if (!filteredTokens || filteredTokens.length === 0) return 0;

        const total = filteredTokens.reduce((total, token) => {
            return total + (token.usdEquivalent || 0);
        }, 0);

        const formattedTotal = Number(total.toFixed(2));
        return formattedTotal;
    }, [filteredTokens]);

    const navigateReceivePage = useCallback(() => {
        navigateToPanel("receive");
    }, [navigateToPanel]);

    const navigateSendPage = useCallback(() => {
        navigateToPanel("send");
    }, [navigateToPanel]);

    const navigateToMainWallet = useCallback(() => {
        navigateToPanel("wallet");
    }, [navigateToPanel]);

    const navigateToManage = useCallback(() => {
        navigateToPanel("manage");
    }, [navigateToPanel]);

    // Memoize the loading skeleton component to prevent re-renders
    const loadingSkeleton = useMemo(
        () => (
            <>
                <SheetHeader>
                    <SheetTitle className="flex justify-between items-center mt-2">
                        <span>Wallet</span>
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
            </>
        ),
        [],
    );

    // Render panel content based on active panel type
    const renderPanelContent = useCallback(() => {
        if (isLoading && activePanel === "wallet" && (!rawTokenList || rawTokenList.length === 0)) {
            return loadingSkeleton;
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
                return <ImportPanel onBack={navigateToManage} />;
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
    }, [
        isLoading,
        activePanel,
        rawTokenList,
        panelParams,
        navigateToMainWallet,
        navigateSendPage,
        navigateReceivePage,
        totalUsdEquivalent,
        navigateToManage,
        loadingSkeleton,
    ]);

    // Memoize the content of the sheet
    const content = useMemo(() => {
        if (isLoading && activePanel === "wallet" && (!rawTokenList || rawTokenList.length === 0)) {
            return loadingSkeleton;
        }

        return (
            <>
                {activePanel === "wallet" && (
                    <SheetHeader>
                        <SheetTitle className="mb-2">
                            <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                        </SheetTitle>
                    </SheetHeader>
                )}
                {renderPanelContent()}
            </>
        );
    }, [activePanel, isLoading, rawTokenList, renderPanelContent, loadingSkeleton]);

    // Use forceMount to prevent unmounting when the sheet is closed
    return (
        <SheetContent
            side="right"
            hideCloseButton={activePanel !== "wallet"}
            className="w-[100%] py-4 px-2 flex flex-col h-full"
            // Enable forceMount to prevent re-rendering when the sheet is closed
            forceMount={true}
        >
            {content}
        </SheetContent>
    );
};

WalletPanel.displayName = "WalletPanel";
MainWalletPanel.displayName = "MainWalletPanel";
export default WalletPanel;
