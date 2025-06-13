// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
