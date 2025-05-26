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

import React, { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import AppSidebar from "./app-sidebar";
import { useIdentity } from "@nfid/identitykit/react";
import { useTokens } from "@/hooks/useTokens";

interface SheetWrapperProps {
    children: React.ReactNode;
}

const SheetWrapper: React.FC<SheetWrapperProps> = ({ children }) => {
    const [open, setOpen] = useState(false);
    const identity = useIdentity();
    const { updateTokenInit } = useTokens();
    useEffect(() => {
        const refetch = async () => {
            if (identity) {
                console.log(
                    "identity changed, update token init",
                    identity.getPrincipal().toString(),
                );
                await updateTokenInit();
            }
        };

        refetch();
    }, [identity]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {children}
            <AppSidebar onClose={() => setOpen(false)} />
        </Sheet>
    );
};

export default SheetWrapper;
