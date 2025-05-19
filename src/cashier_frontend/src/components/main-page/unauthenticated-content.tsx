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

    const walletDialogOptions = headerWalletOptions.map((option) => ({
        ...option,
        onClick: () => {
            setIsWalletDialogOpen(false);
            if (option.id === InternetIdentity.id) connectToWallet(InternetIdentity.id);
        },
    }));

    return (
        <>
            <p className="text-yellow text-center text-sm font-semibold border-2 border-yellow p-2 mx-auto rounded-sm bg-lightyellow mt-4 mb-2">
                {t("main_page.unauthenticated_content.development_warning_1")}
                {responsive.isSmallDevice ? <br /> : <span> </span>}
                {t("main_page.unauthenticated_content.development_warning_2")}
            </p>

            <div
                className={`flex ${responsive.isSmallDevice ? "flex-col" : "flex-row gap-16 mt-[10vh]"}`}
            >
                <div
                    className={`flex flex-col w-full justify-center gap-2 ${
                        responsive.isSmallDevice ? "items-center gap-2" : "items-start gap-6 mt-4"
                    }`}
                >
                    <span
                        className={`font-semibold ${responsive.isSmallDevice ? "text-center text-3xl" : "text-left text-6xl"}`}
                    >
                        {t("main_page.unauthenticated_content.big_title_1")}
                        <br />
                        {t("main_page.unauthenticated_content.big_title_2")} {""}
                        <span className="text-green">
                            {t("main_page.unauthenticated_content.big_title_3")}
                        </span>{" "}
                    </span>
                    <span
                        className={`text-gray-500 ${
                            responsive.isSmallDevice ? "text-center text-sm" : "text-left text-base"
                        }`}
                    >
                        {t("main_page.unauthenticated_content.description_1")}
                        <br />
                        {t("main_page.unauthenticated_content.description_2")}
                    </span>
                    {!responsive.isSmallDevice && (
                        <Button
                            type="button"
                            onClick={() => setIsWalletDialogOpen(true)}
                            className="h-11 mt-8 text-[1rem] bottom-[30px] w-[90%] max-w-[350px] rounded-full"
                        >
                            {t("main_page.unauthenticated_content.get_started")}
                        </Button>
                    )}
                </div>
                <img
                    src="./landingPage.png"
                    alt="Cashier illustration"
                    className={`${responsive.isSmallDevice ? "w-[100%] mt-8" : "w-[50%]"}`}
                />
            </div>
            {responsive.isSmallDevice && (
                <Button
                    type="button"
                    onClick={() => setIsWalletDialogOpen(true)}
                    className="fixed h-11 text-[1rem] bottom-[30px] w-[90%] max-w-[350px] rounded-full left-1/2 -translate-x-1/2"
                >
                    {t("main_page.unauthenticated_content.get_started")}
                </Button>
            )}
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
