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
import { useResponsive } from "@/hooks/responsive-hook";
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
    const responsive = useResponsive();
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
            {/* <p className="text-yellow text-center text-sm font-semibold border-2 border-yellow p-2 mx-auto rounded-sm bg-lightyellow mt-4 mb-2 whitespace-pre-wrap">
                {t("main_page.unauthenticated_content.development_warning_1")
                    .split(". ")
                    .join(".\n")}
            </p> */}

            <div
                id="main-container"
                className="flex flex-col lg:bg-[url('/LandingPageBackgroundPattern.svg')] lg:bg-cover lg:bg-center lg:w-full lg:h-full lg:pt-24"
            >
                <div
                    id="main-content"
                    className="flex flex-col lg:flex-row lg:w-full lg:justify-center lg:px-[200px]"
                >
                    <div
                        id="information"
                        className="flex flex-col items-center lg:items-start lg:justify-center lg:w-[60%]"
                    >
                        <div id="badges" className="flex gap-4 items-center mt-4">
                            {badges.map((badge) => (
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
                            className="flex gap-2 items-center text-[12px] font-light text-[#8D8D8D]/75 mt-8 lg:hidden"
                        >
                            <p>Powered by Internet Computer</p>
                            <img src="/icpToken.png" alt="Internet Computer" className="w-4 h-4" />
                        </div>
                    </div>
                    <div
                        id="image-container"
                        className="flex flex-col items-center justify-center mt-6 lg:w-[50%]"
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
                    className="hidden gap-2 items-center text-[12px] font-light text-[#8D8D8D]/75 mt-8 lg:flex lg:fixed bottom-4  w-full  justify-center"
                >
                    <p>Powered by Internet Computer</p>
                    <img src="/icpToken.png" alt="Internet Computer" className="w-4 h-4" />
                </div>
            </div>
            {/* {responsive.isSmallDevice && (
                <Button
                    type="button"
                    onClick={() => setIsWalletDialogOpen(true)}
                    className="fixed h-11 text-[1rem] bottom-[30px] w-[90%] max-w-[350px] rounded-full left-1/2 -translate-x-1/2"
                >
                    {t("main_page.unauthenticated_content.get_started")}
                </Button>
            )} */}
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
