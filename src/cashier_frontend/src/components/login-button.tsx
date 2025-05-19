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

import { cn } from "@/lib/utils";
import { ConnectWalletButton } from "@nfid/identitykit/react";
import React from "react";

interface ConnectWalletButtonProps {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    className?: string;
    children: React.ReactNode;
}

const LoginButton: React.FC<ConnectWalletButtonProps> = ({ onClick, className, children }) => {
    return (
        <ConnectWalletButton
            onClick={onClick}
            className={cn(
                className,
                "min-w-[75px] min-h-[45px] font-500 bg-transparent border-lightgreen text-green shadow hover:bg-green/90 hover:text-white transition-all duration-300",
            )}
        >
            {children}
        </ConnectWalletButton>
    );
};

export default LoginButton;
