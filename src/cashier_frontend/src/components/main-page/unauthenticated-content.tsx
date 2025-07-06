// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import WalletConnectDialog from "@/components/wallet-connect-dialog";
import { InternetIdentity } from "@nfid/identitykit";
import { useTranslation } from "react-i18next";
import { Feather, Lock, Zap, ChevronDown, ChevronUp } from "lucide-react";

interface UnauthenticatedContentProps {
    headerWalletOptions: Array<{
        id: string;
        name: string;
        icon: string;
        description?: string;
    }>;
    connectToWallet: (id: string) => void;
}

export const UnauthenticatedContent = ({
    headerWalletOptions,
    connectToWallet,
}: UnauthenticatedContentProps) => {
    const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
    const [isDevelopmentBannerCollapsed, setIsDevelopmentBannerCollapsed] = useState(false);
    const { t } = useTranslation();

    // Local storage key for development banner state
    const DEV_BANNER_STORAGE_KEY = "cashier_dev_banner_collapsed";

    // Load collapsed state from localStorage on component mount
    useEffect(() => {
        const savedState = localStorage.getItem(DEV_BANNER_STORAGE_KEY);
        if (savedState === "true") {
            setIsDevelopmentBannerCollapsed(true);
        }
    }, []);

    // Toggle development banner and save to localStorage
    const toggleDevelopmentBanner = () => {
        const newState = !isDevelopmentBannerCollapsed;
        setIsDevelopmentBannerCollapsed(newState);
        localStorage.setItem(DEV_BANNER_STORAGE_KEY, newState.toString());
    };

    const badges = [
        {
            label: "Easy",
            icon: <Feather strokeWidth={2.5} className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />,
        },
        {
            label: "Fast",
            icon: <Zap strokeWidth={2.5} className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />,
        },
        {
            label: "Safe",
            icon: <Lock strokeWidth={2.5} className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />,
        },
    ];

    const walletDialogOptions = headerWalletOptions.map((option) => ({
        ...option,
        onClick: () => {
            setIsWalletDialogOpen(false);
            if (option.id === InternetIdentity.id) connectToWallet(InternetIdentity.id);
        },
    }));

    return (
        <>
            <div
                id="main-container"
                className="flex flex-col lg:bg-[url('/LandingPageBackgroundPattern.svg')] lg:bg-cover lg:bg-center lg:w-full lg:h-full lg:pt-24"
            >
                <div
                    id="development-disclaimer"
                    className="mx-auto px-4 py-2 bg-[#ECFEF3] border rounded-xl border-[#ACEFC6] w-10/12 lg:fixed lg:top-10 lg:w-96 lg:left-1/2 lg:-translate-x-1/2 transition-all duration-300 ease-in-out"
                >
                    <div className="max-w-[1200px] mx-auto">
                        <div className="flex flex-col gap-2 items-center text-[#35A18B] text-[11px] lg:text-[14px]">
                            <div className="flex flex-row gap-1.5 items-center w-full justify-between">
                                <div className="flex flex-row gap-1.5 items-center flex-1 justify-center">
                                    <Lock
                                        strokeWidth={2.5}
                                        className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5"
                                    />
                                    <span>In Development</span>
                                </div>
                                <button
                                    onClick={toggleDevelopmentBanner}
                                    className="flex items-center justify-center w-5 h-5 hover:bg-[#35A18B]/10 rounded-full transition-colors duration-200"
                                    aria-label={
                                        isDevelopmentBannerCollapsed
                                            ? "Expand development notice"
                                            : "Collapse development notice"
                                    }
                                >
                                    {isDevelopmentBannerCollapsed ? (
                                        <ChevronDown strokeWidth={2.5} className="w-3 h-3" />
                                    ) : (
                                        <ChevronUp strokeWidth={2.5} className="w-3 h-3" />
                                    )}
                                </button>
                            </div>
                            {!isDevelopmentBannerCollapsed && (
                                <p className="text-[10px] lg:text-[12px] text-[#475467] text-center transition-all duration-300 ease-in-out">
                                    This website is currently in development and provided for
                                    demonstration purposes only. It is not intended for public use.
                                    Any data entered or actions taken on this site may not be
                                    secure, saved, or processed correctly. Use is at your own risk.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div
                    id="main-content"
                    className="flex flex-col lg:flex-row lg:w-full lg:justify-center lg:px-[200px] md:px-8"
                >
                    <div
                        id="information"
                        className="flex flex-col items-center md:items-center lg:items-start lg:justify-center lg:w-[60%] md:text-center lg:text-left"
                    >
                        <div id="badges" className="flex gap-4 items-center mt-4 md:justify-center">
                            {badges.slice(0, 3).map((badge) => (
                                <div
                                    key={badge.label}
                                    className="flex flex-row gap-1.5 items-center text-[#35A18B] text-[11px] md:text-[13px] lg:text-[14px] bg-[#ECFEF3] rounded-full w-fit px-3 py-1 border border-[#ACEFC6]"
                                >
                                    {badge.icon} <span>{badge.label}</span>
                                </div>
                            ))}
                        </div>
                        <h1
                            id="title"
                            className="text-[32px] md:text-[48px] lg:text-[60px] font-bold mt-2 lg:my-[16px] leading-[1.2] px-4 md:px-8 lg:px-0 text-center md:text-center lg:text-left"
                        >
                            Share crypto{" "}
                            <span className="text-[#35A18B]">as easily as texting</span>
                        </h1>
                        <p
                            id="description"
                            className="text-[14px] md:text-[18px] font-light text-[#475467] px-4 md:px-8 lg:px-0 lg:text-[20px] text-center md:text-center lg:text-left"
                        >
                            Send or receive tokens & NFTs with just a link or QR code
                        </p>

                        <ul className="flex flex-col gap-2 md:gap-3 mt-4 lg:mt-6 self-center md:self-center lg:self-start px-4 md:px-8 lg:px-0">
                            <li className="flex items-center gap-2 md:justify-center lg:justify-start">
                                <div className="w-2 h-2 bg-[#35A18B] rounded-full"></div>
                                <p className="text-[10px] md:text-[14px] text-[#475467] lg:text-[16px] text-left font-light">
                                    No wallet setup or address sharing
                                </p>
                            </li>
                            <li className="flex items-center gap-2 md:justify-center lg:justify-start">
                                <div className="w-2 h-2 bg-[#35A18B] rounded-full"></div>
                                <p className="text-[10px] md:text-[14px] text-[#475467] lg:text-[16px] text-left font-light">
                                    Use for tips, invoice, airdrops & swaps
                                </p>
                            </li>
                            <li className="flex items-center gap-2 md:justify-center lg:justify-start">
                                <div className="w-2 h-2 bg-[#35A18B] rounded-full"></div>
                                <p className="text-[10px] md:text-[14px] text-[#475467] lg:text-[16px] text-left font-light">
                                    Lock with a password, NFT, or X
                                </p>
                            </li>
                        </ul>

                        <Button
                            type="button"
                            onClick={() => setIsWalletDialogOpen(true)}
                            className="hidden md:block lg:block h-[48px] text-[1rem] bottom-[30px] w-[248px] rounded-full mt-[48px] md:mt-8 lg:mt-[48px]"
                        >
                            {t("main_page.unauthenticated_content.get_started")}
                        </Button>
                    </div>
                    <div
                        id="image-container"
                        className="flex flex-col items-center justify-center mt-6 md:mt-8 lg:w-[40%]"
                    >
                        <img
                            src="/LandingPageMainImage.svg"
                            className="mx-auto w-[55%] max-w-[300px] max-h-[40vh] object-contain lg:w-[70%] lg:max-w-[400px] lg:max-h-[50vh]"
                        />

                        <Button
                            type="button"
                            onClick={() => setIsWalletDialogOpen(true)}
                            className="fixed h-11 text-[1rem] bottom-[30px] w-[90%] max-w-[350px] rounded-full left-1/2 -translate-x-1/2 md:hidden"
                        >
                            {t("main_page.unauthenticated_content.get_started")}
                        </Button>
                    </div>
                </div>

                <div
                    id="powered-by-icp"
                    className="flex-col items-center gap-1 bg-white text-[8px] lg:text-[12px] font-light text-[#8D8D8D]/75 mt-8 lg:flex fixed bottom-1 lg:bottom-4 w-full justify-center"
                >
                    <div className="flex gap-2 items-center justify-center">
                        <p>Powered by Internet Computer</p>
                        <img src="/icpToken.png" alt="Internet Computer" className="w-4 h-4" />
                    </div>
                </div>
            </div>
            <WalletConnectDialog
                open={isWalletDialogOpen}
                onOpenChange={setIsWalletDialogOpen}
                walletOptions={walletDialogOptions}
                title={t("main_page.unauthenticated_content.connect_wallet_title")}
                viewAllLink={false}
            />
        </>
    );
};
