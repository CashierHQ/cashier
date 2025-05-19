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

import React from "react";
import { Sheet } from "@/components/ui/sheet";
import WalletPanel from "./wallet-panel";

interface WalletSheetWrapperProps {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const WalletSheetWrapper: React.FC<WalletSheetWrapperProps> = ({
    children,
    open,
    onOpenChange,
}) => {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            {children}
            <WalletPanel onClose={() => onOpenChange(false)} />
        </Sheet>
    );
};

export default WalletSheetWrapper;
