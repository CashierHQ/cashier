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

import { useState } from "react";
import { Button } from "@/components/ui/button";
import WalletConnectDialog from "@/components/wallet-connect-dialog";
import { InternetIdentity } from "@nfid/identitykit";
import { useTranslation } from "react-i18next";
import { Feather, Lock, Zap } from "lucide-react";

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
    const { t } = useTranslation();

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
                    className="mx-auto px-4 py-2 bg-[#ECFEF3] border rounded-xl border-[#ACEFC6] w-10/12 lg:fixed lg:top-10 lg:w-96 lg:left-1/2 lg:-translate-x-1/2"
                >
                    <div className="max-w-[1200px] mx-auto">
                        <div className="flex flex-col gap-2 items-center text-[#35A18B] text-[11px] lg:text-[14px]">
                            <div className="flex flex-row gap-1.5 items-center">
                                <Lock strokeWidth={2.5} className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
                                <span>In Development</span>
                            </div>
                            <p className="text-[10px] lg:text-[12px] text-[#475467] text-center">
                                This website is currently in development and provided for
                                demonstration purposes only. It is not intended for public use. Any
                                data entered or actions taken on this site may not be secure, saved,
                                or processed correctly. Use is at your own risk.
                            </p>
                        </div>
                    </div>
                </div>
                <div
                    id="main-content"
                    className="flex flex-col lg:flex-row lg:w-full lg:justify-center lg:px-[200px]"
                >
                    <div
                        id="information"
                        className="flex flex-col items-center lg:items-start lg:justify-center lg:w-[60%]"
                    >
                        <div id="badges" className="flex gap-4 items-center mt-4">
                            {badges.slice(0, 3).map((badge) => (
                                <div
                                    key={badge.label}
                                    className="flex flex-row gap-1.5 items-center text-[#35A18B] text-[11px] lg:text-[14px] bg-[#ECFEF3] rounded-full w-fit px-3 py-1 border border-[#ACEFC6]"
                                >
                                    {badge.icon} <span>{badge.label}</span>
                                </div>
                            ))}
                        </div>
                        <h1
                            id="title"
                            className="text-[32px] lg:text-[60px] font-bold mt-2 lg:my-[16px]"
                        >
                            Web3 for <span className="text-[#35A18B]">everyone</span>
                        </h1>
                        <p
                            id="description"
                            className="text-[14px] font-light text-center text-[#475467] px-4 lg:px-0 lg:text-[20px] lg:text-left"
                        >
                            Build and share blockchain transactions with zero coding — all from your
                            phone.
                        </p>

                        <Button
                            type="button"
                            onClick={() => setIsWalletDialogOpen(true)}
                            className="hidden lg:block h-[48px] text-[1rem] bottom-[30px] w-[248px] rounded-full mt-[48px]"
                        >
                            {t("main_page.unauthenticated_content.get_started")}
                        </Button>

                        <div
                            id="powered-by-icp"
                            className="flex flex-col items-center gap-1 text-[12px] font-light text-[#8D8D8D]/75 mt-8 lg:hidden"
                        >
                            <div className="flex gap-2 items-center">
                                <p>Powered by Internet Computer</p>
                                <img
                                    src="/icpToken.png"
                                    alt="Internet Computer"
                                    className="w-4 h-4"
                                />
                            </div>
                            <p className="text-[10px] opacity-50">
                                v{__APP_VERSION__} ({__BUILD_HASH__})
                            </p>
                        </div>
                    </div>
                    <div
                        id="image-container"
                        className="flex flex-col items-center justify-center mt-6 lg:w-[40%]"
                    >
                        <img src="/LandingPageMainImage.svg" className="mx-auto w-[55%]" />

                        <Button
                            type="button"
                            onClick={() => setIsWalletDialogOpen(true)}
                            className="fixed h-11 text-[1rem] bottom-[30px] w-[90%] max-w-[350px] rounded-full left-1/2 -translate-x-1/2 lg:hidden"
                        >
                            {t("main_page.unauthenticated_content.get_started")}
                        </Button>
                    </div>
                </div>

                <div
                    id="powered-by-icp"
                    className="hidden flex-col items-center gap-1 text-[12px] font-light text-[#8D8D8D]/75 mt-8 lg:flex lg:fixed bottom-4 w-full justify-center"
                >
                    <div className="flex gap-2 items-center">
                        <p>Powered by Internet Computer</p>
                        <img src="/icpToken.png" alt="Internet Computer" className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] opacity-50">
                        v{__APP_VERSION__} ({__BUILD_HASH__})
                    </p>
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
