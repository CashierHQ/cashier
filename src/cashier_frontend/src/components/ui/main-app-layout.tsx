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

import { useAuth } from "@nfid/identitykit/react";
import { useResponsive } from "@/hooks/responsive-hook";
import Header from "@/components/header";
import SheetWrapper from "@/components/sheet-wrapper";
import WalletSheetWrapper from "@/components/wallet/wallet-sheet-wrapper";
import { ReactNode, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useWalletContext } from "@/contexts/wallet-context";

type MainAppLayoutProps = {
    children: ReactNode;
};

export const MainAppLayout = ({ children }: MainAppLayoutProps) => {
    const responsive = useResponsive();
    const { pathname } = useLocation();
    const { user: walletUser } = useAuth();
    const { isWalletOpen, closeWallet } = useWalletContext();

    // Prevent body scrolling on iOS
    useEffect(() => {
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.position = "";
            document.body.style.width = "";
            document.body.style.height = "";
            document.body.style.overflow = "";
        };
    }, []);

    const isHeaderHidden = useMemo(() => {
        const hiddenPaths = ["/edit", "/details"];
        const isLargeDevice = !responsive.isSmallDevice;

        return hiddenPaths.some((path) => pathname.includes(path)) && !isLargeDevice;
    }, [pathname, responsive.isSmallDevice]);

    if (!walletUser && pathname === "/") {
        return (
            <div className="fixed inset-0 flex justify-center py-5 overflow-hidden bg-white">
                <div className="flex w-full flex-col items-center gap-4">
                    <Header />
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`fixed inset-0 flex justify-center overflow-hidden ${responsive.isSmallDevice ? "" : "bg-lightgreen"}`}
        >
            <WalletSheetWrapper open={isWalletOpen} onOpenChange={closeWallet}>
                <SheetWrapper>
                    <div className="flex w-full flex-col h-full overflow-hidden">
                        {!isHeaderHidden && <Header />}
                        <div
                            className={`flex items-center justify-center flex-col ${
                                responsive.isSmallDevice
                                    ? "px-4 pt-4 h-full overflow-y-auto overscroll-none"
                                    : "h-[90%] w-[600px] px-4 items-center bg-[white] shadow-[#D6EDE433] shadow-sm rounded-[16px] mx-auto pt-8 pb-4 overflow-y-auto overscroll-none"
                            }`}
                        >
                            {children}
                        </div>
                    </div>
                </SheetWrapper>
            </WalletSheetWrapper>
        </div>
    );
};
